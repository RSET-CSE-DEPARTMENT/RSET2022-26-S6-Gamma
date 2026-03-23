using System.Collections;
using System.Collections.Generic;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.AI;

public class SeekerAI : MonoBehaviour
{
    private enum SeekerState { Patrolling, LookingAround, Chasing, CheckingLastSeen, CheckingOutlier}

    [Header("References")]
    public NavMeshAgent agent;
    public RaycastSensor raycastSensor;
    public TrainingGameManager gameManager;
    
    private string hiderTag = "hider";

    [Header("Seeker Stats")]
    [SerializeField] private float rotateSpeed = 360f;
    [SerializeField] private float chaseSpeed = 3f;
    [SerializeField] private float patrolSpeed = 2f;
    [SerializeField] private float distanceForBeingOutlier = 2f;

    private float rotationProgress = 0f;
    private float rotationDirection = 1f;

    [Header("Patrolling")]
    [SerializeField] private Transform[] patrolPoints;
    private int patrolIndex = 0;

    [Header("Telemetry")]
    [SerializeField] private SeekerState currentState = SeekerState.Patrolling;
    [SerializeField] private Vector3? lastSeenPosition = null;
    [SerializeField] private float outlierDistanceFromProps;
    private bool caught;

    private void Awake()
    {
        agent.updateRotation = true;
    }

    void Update()
    {
        var hiderObj = CheckForHiderInView();

        if (hiderObj != null) 
        {
            currentState = SeekerState.Chasing;
        }
        else
        {
            if (currentState == SeekerState.Chasing) 
            {
                currentState = SeekerState.CheckingLastSeen;
            }
        }

        switch (currentState)
        {
            case SeekerState.Chasing: 
                Chase(hiderObj.Value);
                break;

            case SeekerState.CheckingLastSeen:
                CheckLastSeen();
                break;

            case SeekerState.Patrolling:
                Patrol();
                break;

            case SeekerState.LookingAround:
                LookAround();
                break;

            case SeekerState.CheckingOutlier:
                Chase(hiderObj.Value);
                break;
        }
    }

    #region sensor methods
    private RaycastSensor.RaycastHitData? CheckForHiderInView()
    {
        var detectedObjects = raycastSensor.CastRays();
        RaycastSensor.RaycastHitData? hider = null;
        foreach (var obj in detectedObjects)
        {
            // Detect the hider in its original form or if a props velocity 
            if (obj.tag == hiderTag || obj.velocity > 0f || obj.angularVelocity > 0f)
            {
                hider = obj;
                return hider;
            }
        }
        if (hider == null && (currentState != SeekerState.CheckingLastSeen && currentState !=SeekerState.Chasing))
        {
            hider = FindOutlierProp(detectedObjects);
        }

        return hider;
    }

    private RaycastSensor.RaycastHitData? FindOutlierProp(List<RaycastSensor.RaycastHitData> detectedObjects)
    {
        if (detectedObjects.Count == 0) return null;

        // Compute the average position of all props
        Vector3 averagePosition = Vector3.zero;
        foreach (var obj in detectedObjects)
        {
            averagePosition += obj.position;
        }
        averagePosition /= detectedObjects.Count;

        // Find the prop that is the farthest from the average position
        RaycastSensor.RaycastHitData? outlier = null;
        float maxDistance = 0f;

        foreach (var obj in detectedObjects)
        {
            float distanceFromAverage = Vector3.Distance(obj.position, averagePosition);
            if (distanceFromAverage > maxDistance)
            {
                maxDistance = distanceFromAverage;
                outlier = obj;
            }
        }
        if (maxDistance < distanceForBeingOutlier)
        {
            outlier = null;
        }
        else 
        {
            outlierDistanceFromProps = maxDistance;
            currentState = SeekerState.CheckingOutlier;
        }

        return outlier;
    }

    private bool CheckAgentReachedDestination()
    {
        var reached = false;

        if (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance)
        {
            if (!agent.hasPath || agent.velocity.sqrMagnitude == 0f)
            {
                reached = true;
            }
        }

        return reached;
    }

    #endregion

    #region state methods

    private void Chase(RaycastSensor.RaycastHitData target)
    {
        agent.speed = chaseSpeed;
        lastSeenPosition = target.position;
        agent.SetDestination(lastSeenPosition.Value);
    }

    private void CheckLastSeen()
    {
        agent.speed = patrolSpeed;
        agent.SetDestination(lastSeenPosition.Value);

        if (CheckAgentReachedDestination())
        {
            var targetDirection = lastSeenPosition.Value - transform.position;
            rotationDirection = Vector3.SignedAngle(Vector3.forward, targetDirection, Vector3.up) < 0 ? -1f : 1f;
            currentState = SeekerState.LookingAround;
        }    
    }

    private void Patrol()
    {
        agent.speed = patrolSpeed;
        agent.SetDestination(patrolPoints[patrolIndex].position);

        if (CheckAgentReachedDestination())
        {
            patrolIndex = (patrolIndex + 1) % patrolPoints.Length;
            currentState = SeekerState.LookingAround;
        }
    }

    private void LookAround()
    {
        var angle = rotateSpeed * Time.deltaTime;
        rotationProgress += angle;

        if(rotationProgress < 360)
        {
            transform.Rotate(Vector3.up, rotationDirection * angle);
        }
        else
        {
            rotationProgress = 0f;
            currentState = SeekerState.Patrolling;
        }
    }
    #endregion

    private void OnCollisionEnter(Collision collision)
    {
        if (collision.transform.parent != null)
        {
            GameObject gameObject = collision.transform.parent.gameObject;
            if (gameObject.name == "Hider")
            {
                gameManager.OnHiderCaught();
            }

            else if (currentState == SeekerState.CheckingOutlier && gameObject.name != "Hider")
            {
                currentState = SeekerState.Patrolling;
            }
        }
    }

    public void Reset()
    {
        lastSeenPosition = null;
        currentState = SeekerState.Patrolling;
    }
}
