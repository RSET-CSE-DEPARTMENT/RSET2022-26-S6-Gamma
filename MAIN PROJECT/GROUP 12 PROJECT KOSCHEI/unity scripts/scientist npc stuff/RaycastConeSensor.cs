using System.Collections.Generic;
using UnityEngine;

public class RaycastConeSensor : MonoBehaviour
{
    [Header("Cone Settings")]
    [Tooltip("Total horizontal + vertical FOV in degrees.")]
    public float coneAngle = 90f;

    [Tooltip("How many steps per axis (horizontal & vertical).")]
    public int raysPerAxis = 8;

    [Tooltip("Detection range.")]
    public float raycastLength = 10f;

    [Tooltip("Layers to raycast against (players + obstacles).")]
    public LayerMask detectionLayer;

    [Tooltip("Tags that count as valid detected objects.")]
    public List<string> detectableTags = new List<string> { "Player" };

    [System.Serializable]
    public struct RaycastHitData
    {
        public string tag;
        public Transform transform;
        public Vector3 position;
        public float distance;
    }

    /// <summary>
    /// Casts a cone of rays and returns all detected objects that match detectableTags.
    /// </summary>
    public List<RaycastHitData> CastRays()
    {
        List<RaycastHitData> detectedObjects = new List<RaycastHitData>();
        float halfAngle = coneAngle * 0.5f;

        // We sweep in 2D: yaw (around Y) and pitch (around X)
        for (int yi = 0; yi < raysPerAxis; yi++) // vertical (pitch)
        {
            float vLerp = (raysPerAxis == 1) ? 0.5f : yi / (float)(raysPerAxis - 1);
            float pitch = Mathf.Lerp(-halfAngle, halfAngle, vLerp);

            for (int xi = 0; xi < raysPerAxis; xi++) // horizontal (yaw)
            {
                float hLerp = (raysPerAxis == 1) ? 0.5f : xi / (float)(raysPerAxis - 1);
                float yaw = Mathf.Lerp(-halfAngle, halfAngle, hLerp);

                // Build direction by rotating forward by pitch (X) then yaw (Y)
                Quaternion rot = Quaternion.Euler(pitch, yaw, 0f);
                Vector3 direction = rot * transform.forward;

                if (Physics.Raycast(transform.position, direction, out RaycastHit hit, raycastLength, detectionLayer))
                {
                    Color rayColor = Color.green;

                    if (detectableTags.Contains(hit.collider.tag))
                    {
                        detectedObjects.Add(new RaycastHitData
                        {
                            tag = hit.collider.tag,
                            transform = hit.collider.transform,
                            position = hit.collider.transform.position,
                            distance = hit.distance
                        });
                        rayColor = Color.red; // hit a detectable target
                    }

                    Debug.DrawRay(transform.position, direction * hit.distance, rayColor);
                }
                else
                {
                    Debug.DrawRay(transform.position, direction * raycastLength, Color.yellow);
                }
            }
        }

        return detectedObjects;
    }

    /// <summary>
    /// Returns the closest detected Transform with the given tag.
    /// </summary>
    public Transform GetClosestTarget(string targetTag = "Player")
    {
        List<RaycastHitData> hits = CastRays();
        Transform closest = null;
        float bestDist = float.MaxValue;

        foreach (var hit in hits)
        {
            if (hit.tag == targetTag && hit.distance < bestDist)
            {
                bestDist = hit.distance;
                closest = hit.transform;
            }
        }

        return closest;
    }
}
