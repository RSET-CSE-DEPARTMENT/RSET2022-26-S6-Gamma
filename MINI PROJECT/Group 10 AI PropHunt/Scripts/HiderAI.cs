using System.Collections.Generic;
using UnityEngine;
using Unity.MLAgents;
using Unity.MLAgents.Sensors;
using Unity.MLAgents.Actuators;

public class HiderAI : Agent
{
    [Header("References")]
    [SerializeField] private HiderController hiderController;
    [SerializeField] private RaycastSensor raycastSensor;

    [Header("Tags & Detection Settings")]
    [SerializeField] private List<string> detectablePropTags;
    [SerializeField] private string seekerTag;

    [Header("Round duration")]
    [SerializeField] private float roundTime = 40;
    [Header("Debug Info")]
    [SerializeField] private int currentFormIndex; // To track current form in Inspector
    
    private float seekerDistance;
    private float episodeStartTime;

    public override void OnEpisodeBegin()
    {
        Reset();
        episodeStartTime = Time.time;
        SetReward(0);
        seekerDistance = raycastSensor.GetSeekerDistance();
    }

    private void FixedUpdate()
    {
        // Check if round time is up and Hider is still alive
        if (Time.time - episodeStartTime >= roundTime)
        {
            AddReward(50f);
            EndEpisode();
        }
    }

    public override void CollectObservations(VectorSensor sensor)
    {
        // 1. Transformation duration remaining (continuous)
        sensor.AddObservation(hiderController.GetCurrentTransformationDurationRemaining());

        // 2. Transformation cooldown remaining (continuous)
        sensor.AddObservation(hiderController.GetTransformCooldownRemaining());

        // 3. Prop count per type in view (discrete array)
        List<RaycastSensor.RaycastHitData> detectedObjects = raycastSensor.CastRays();
        Dictionary<string, int> propTypeCount = new Dictionary<string, int>();
        Dictionary<string, float> minDistances = new Dictionary<string, float>();

        foreach (var propTag in detectablePropTags)
        {
            propTypeCount[propTag] = 0;
            minDistances[propTag] = float.MaxValue;
        }

        float seekerDistance = float.MaxValue;

        foreach (var hit in detectedObjects)
        {
            if (hit.tag == seekerTag)
            {
                seekerDistance = hit.distance;
            }
            else if (detectablePropTags.Contains(hit.tag))
            {
                propTypeCount[hit.tag]++;
                if (hit.distance < minDistances[hit.tag])
                {
                    minDistances[hit.tag] = hit.distance;
                }
            }
        }

        foreach (var propTag in detectablePropTags)
        {
            sensor.AddObservation(propTypeCount[propTag]);
            sensor.AddObservation(minDistances[propTag] == float.MaxValue ? raycastSensor.raycastLength : minDistances[propTag]);
        }

        // 4. Seeker distance 
        sensor.AddObservation(seekerDistance == float.MaxValue ? raycastSensor.raycastLength : seekerDistance);

        // 5. Current form index
        currentFormIndex = hiderController.GetCurrentFormIndex();
        sensor.AddObservation(currentFormIndex);

        // 6. Angular velocity 
        sensor.AddObservation(hiderController.GetAngularVelocity());

        // 7. Velocity
        sensor.AddObservation(hiderController.GetVelocity());
    }

    public override void OnActionReceived(ActionBuffers actions)
    {
        float move = actions.DiscreteActions[0] == 1 ? 1f : 0f;
        float turn = actions.DiscreteActions[1] == 1 ? 1f : actions.DiscreteActions[1] == 2 ? -1f : 0f;
        int transformIndex = actions.DiscreteActions[2];

        // Move and transform
        hiderController.Move(move);
        hiderController.Turn(turn);
        hiderController.TransformHider(transformIndex);
        currentFormIndex = transformIndex; // Update current form

        float previousSeekerDistance = seekerDistance;
        seekerDistance = raycastSensor.GetSeekerDistance();

        //  Reward survival
        AddReward(0.1f); // Small positive reward per step

        //  Reward transformation if it helps
        if (transformIndex != 0)
        {
            if (seekerDistance > previousSeekerDistance) // If transformation helps avoid seeker
            {
                AddReward(5f);
            }
            if ((hiderController.GetAngularVelocity().sqrMagnitude > 0f || hiderController.GetVelocity().sqrMagnitude > 0f) && previousSeekerDistance > seekerDistance)
            {
                AddReward(-0.5f);
            }
        }
        else
        {
            AddReward(-0.2f);
        }


        if (transformIndex == 0)
        {
            if (hiderController.GetAngularVelocity().sqrMagnitude == 0f)
            {
                AddReward(-0.5f);
            }
            if (hiderController.GetVelocity().sqrMagnitude == 0f)
            {
                AddReward(-0.5f);
            }
        }
    }


    public override void Heuristic(in ActionBuffers actionsOut)
    {
        var discreteActions = actionsOut.DiscreteActions;
        discreteActions[0] = Input.GetKey(KeyCode.W) ? 1 : 0; // Move forward
        discreteActions[1] = Input.GetKey(KeyCode.A) ? 2 : (Input.GetKey(KeyCode.D) ? 1 : 0); // Turn left/right
        discreteActions[2] = Input.GetKey(KeyCode.Alpha1) ? 1 : Input.GetKey(KeyCode.Alpha2) ? 2 : Input.GetKey(KeyCode.Alpha3) ? 3 : Input.GetKey(KeyCode.Alpha4) ? 4 : Input.GetKey(KeyCode.Alpha5) ? 5 : Input.GetKey(KeyCode.Alpha6) ? 6 : Input.GetKey(KeyCode.Alpha0) ? 0 : 0;
    }

    private void Reset()
    {
        hiderController.ActivateForm(0);
        hiderController.ResetTimes();
    }

    private void OnCollisionEnter(Collision collision)
    {
        if (collision.gameObject.CompareTag("Seeker"))
        {
            AddReward(-4000f); // Penalize for getting caught
            EndEpisode(); // Reset the episode
        }
    }
}
