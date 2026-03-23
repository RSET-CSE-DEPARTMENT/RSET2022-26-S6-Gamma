using System.Collections.Generic;
using UnityEngine;

public class RaycastSensor : MonoBehaviour
{
    [Header("Raycast Settings")]
    public float raycastAngle = 90f;  // Total field of view
    public int raysPerAngle = 10;     // Number of rays within the angle
    public float raycastLength = 10f; // Detection range
    public LayerMask detectionLayer;  // Objects to detect
    public List<string> detectableTags = new List<string>(); // Tags to detect

    public struct RaycastHitData
    {
        public string tag;
        public Vector3 position;
        public float distance;
        public float velocity;
        public float angularVelocity;
    }

    public List<RaycastHitData> CastRays()
    {
        List<RaycastHitData> detectedObjects = new List<RaycastHitData>();
        float startAngle = -raycastAngle / 2f;
        float angleStep = raycastAngle / (raysPerAngle - 1);

        for (int i = 0; i < raysPerAngle; i++)
        {
            float currentAngle = startAngle + (i * angleStep);
            Vector3 direction = Quaternion.Euler(0, currentAngle, 0) * transform.forward;

            if (Physics.Raycast(transform.position, direction, out RaycastHit hit, raycastLength, detectionLayer))
            {
                if (detectableTags.Contains(hit.collider.tag)) // Check if the object has a valid tag
                {
                    Rigidbody rb = hit.collider.GetComponent<Rigidbody>();
                    HiderController hider = hit.collider.GetComponentInParent<HiderController>();

                    detectedObjects.Add(new RaycastHitData
                    {
                        tag = hit.collider.tag,
                        position = hit.collider.transform.position,
                        distance = hit.distance,
                        velocity = (rb != null && !rb.isKinematic) ? rb.velocity.magnitude : (hider != null) ? hider.GetVelocity().magnitude : 0f,
                        angularVelocity = (hit.collider.tag != "seeker") ? (hider == null) ? 0f : hider.GetAngularVelocity().magnitude : 0f
                    });

                    Debug.DrawRay(transform.position, direction * hit.distance, Color.red);
                }
                else
                {
                    Debug.DrawRay(transform.position, direction * raycastLength, Color.green);
                }
            }
        }

        return detectedObjects;
    }

    public float GetSeekerDistance()
    {
        List<RaycastHitData> detectedObjects = CastRays();
        float seekerDistance = float.MaxValue;

        foreach (var hit in detectedObjects)
        {
            if (hit.tag == "seeker") // Check if it's the Seeker
            {
                seekerDistance = hit.distance; // Store the distance
                break; // No need to check further
            }
        }

        return seekerDistance == float.MaxValue ? raycastLength : seekerDistance;
    }
}
