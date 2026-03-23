using UnityEngine;
using UnityEngine.AI;

public class DebugNavMeshAgent : MonoBehaviour
{
    public bool velocity;
    public bool desiredVelocity;
    public bool path;

    private NavMeshAgent agent;

    void OnDrawGizmos()
    {
        // Lazily fetch agent for editor & runtime safety
        if (agent == null)
        {
            agent = GetComponent<NavMeshAgent>();
            if (agent == null) return;
        }

        if (velocity)
        {
            Gizmos.color = Color.green;
            Gizmos.DrawLine(transform.position, transform.position + agent.velocity);
        }

        if (desiredVelocity)
        {
            Gizmos.color = Color.red;
            Gizmos.DrawLine(transform.position, transform.position + agent.desiredVelocity);
        }

        if (path && agent.hasPath)
        {
            Gizmos.color = Color.blue;

            Vector3 prevCorner = transform.position;
            foreach (var corner in agent.path.corners)
            {
                Gizmos.DrawLine(prevCorner, corner);
                Gizmos.DrawSphere(corner, 0.1f);
                prevCorner = corner;
            }
        }
    }
}
