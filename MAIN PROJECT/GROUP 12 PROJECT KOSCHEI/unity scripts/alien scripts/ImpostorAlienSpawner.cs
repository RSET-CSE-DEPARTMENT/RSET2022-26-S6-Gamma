using Unity.Netcode;
using UnityEngine;
using UnityEngine.AI;
using System.Collections.Generic;

/// <summary>
/// UPDATED: Spawns impostor ONLY when backend commands it
/// No more auto-spawn timer - backend controls spawning
/// </summary>
public class ImpostorAlienSpawner : NetworkBehaviour
{
    [Header("Impostor Settings")]
    public GameObject impostorAlienPrefab;
    public float minSpawnDistanceFromPlayers = 20f;
    public float maxSpawnDistanceFromPlayers = 35f;
    public float navmeshSampleRadius = 3f;
    public LayerMask groundMask;

    [Header("Spawn Area")]
    public Vector3 center;
    public float searchRadius = 80f;
    public float spawnHeightOffset = 0.1f;
    public float maxRaycastHeight = 500f;

    [Header("Debug")]
    public bool showDebugGizmos = true;
    public bool showDebugLogs = true;

    [Header("Backend Integration")]
    public ImpostorBackendConnector backendConnector;

    // Track current impostor
    private NetworkObject currentImpostor;
    private string currentTargetGroupId;
    private string currentDisguiseAs;
    private Vector3 lastAttemptedSpawnPos = Vector3.zero;

    /// <summary>
    /// Get current impostor (for backend connector)
    /// </summary>
    public NetworkObject GetCurrentImpostor()
    {
        return currentImpostor;
    }

    /// <summary>
    /// NEW: Spawn impostor for specific group (called by backend connector)
    /// </summary>
    public void SpawnImpostorForGroup(string targetGroupId, string[] groupMembers, Vector3 groupCenter, string disguiseAs)
    {
        if (!IsServer)
        {
            Debug.LogWarning("[ImpostorSpawner] SpawnImpostorForGroup should only be called on server");
            return;
        }

        if (impostorAlienPrefab == null)
        {
            Debug.LogError("[ImpostorSpawner] impostorAlienPrefab not assigned!");
            return;
        }

        if (currentImpostor != null)
        {
            if (showDebugLogs)
                Debug.LogWarning("[ImpostorSpawner] Impostor already exists! Despawning old one first.");
            DespawnCurrentImpostor();
        }

        if (showDebugLogs)
        {
            Debug.Log($"[ImpostorSpawner] ═══════════════════════════════════");
            Debug.Log($"[ImpostorSpawner] 🎯 SPAWNING IMPOSTOR (Backend Command)");
            Debug.Log($"[ImpostorSpawner] Target Group: {targetGroupId}");
            Debug.Log($"[ImpostorSpawner] Group Members: {string.Join(", ", groupMembers)}");
            Debug.Log($"[ImpostorSpawner] Group Center: {groupCenter}");
            Debug.Log($"[ImpostorSpawner] Disguise: {disguiseAs}");
            Debug.Log($"[ImpostorSpawner] ═══════════════════════════════════");
        }

        // Find spawn position near group
        if (!TryFindSpawnPositionAroundPoint(groupCenter, out Vector3 spawnPos))
        {
            Debug.LogWarning("[ImpostorSpawner] Could not find spawn position near target group.");
            return;
        }

        // Spawn the impostor
        SpawnImpostorAt(spawnPos, groupCenter, targetGroupId, disguiseAs, groupMembers);
    }

    private void SpawnImpostorAt(Vector3 spawnPos, Vector3 targetGroupCenter, string targetGroupId, string disguiseAs, string[] groupMembers)
    {
        lastAttemptedSpawnPos = spawnPos;

        GameObject impostor = Instantiate(impostorAlienPrefab, spawnPos, Quaternion.identity);
        NetworkObject netObj = impostor.GetComponent<NetworkObject>();

        if (netObj == null)
        {
            Debug.LogError("[ImpostorSpawner] impostorAlienPrefab is missing NetworkObject component!");
            Destroy(impostor);
            return;
        }

        // Handle CharacterController positioning
        CharacterController cc = impostor.GetComponent<CharacterController>();
        if (cc != null)
        {
            cc.enabled = false;
            float heightOffset = cc.center.y;
            impostor.transform.position = spawnPos + Vector3.up * heightOffset;
            cc.enabled = true;
            cc.Move(Vector3.zero);

            if (showDebugLogs)
                Debug.Log($"[ImpostorSpawner] Spawned with CC offset: {heightOffset}");
        }

        // Spawn on network
        netObj.Spawn(true);
        currentImpostor = netObj;
        currentTargetGroupId = targetGroupId;
        currentDisguiseAs = disguiseAs;

        // Tell the impostor AI where to go AND who to interact with
        ImpostorPlayerAI ai = impostor.GetComponent<ImpostorPlayerAI>();
        if (ai != null)
        {
            // NEW: Pass group member names so AI can ignore other groups
            ai.SetTargetGroup(targetGroupCenter, groupMembers);

            if (showDebugLogs)
                Debug.Log($"[ImpostorSpawner] ✅ Impostor AI told to go to {targetGroupCenter} (target members: {string.Join(", ", groupMembers)})");
        }
        else
        {
            Debug.LogError("[ImpostorSpawner] ⚠️ ImpostorPlayerAI component not found on impostor prefab!");
        }

        // Notify backend connector
        if (backendConnector != null)
        {
            backendConnector.OnImpostorSpawned(netObj, targetGroupId, disguiseAs);
        }
        else
        {
            Debug.LogWarning("[ImpostorSpawner] ⚠️ No ImpostorBackendConnector assigned!");
        }

        if (showDebugLogs)
            Debug.Log($"[ImpostorSpawner] ✅ Impostor spawned at {spawnPos}");
    }

    /// <summary>
    /// Despawn current impostor (called by backend connector)
    /// </summary>
    public void DespawnCurrentImpostor()
    {
        if (!IsServer)
        {
            Debug.LogWarning("[ImpostorSpawner] DespawnCurrentImpostor should only be called on server");
            return;
        }

        if (currentImpostor == null || !currentImpostor.IsSpawned)
        {
            if (showDebugLogs)
                Debug.Log("[ImpostorSpawner] No impostor to despawn");
            currentImpostor = null;
            return;
        }

        if (showDebugLogs)
            Debug.Log($"[ImpostorSpawner] 🗑️ Despawning impostor");

        // Notify backend connector
        if (backendConnector != null)
        {
            backendConnector.NotifyImpostorDespawned();
        }

        // Despawn from network
        currentImpostor.Despawn(true);
        currentImpostor = null;
        currentTargetGroupId = null;
        currentDisguiseAs = null;
    }

    bool TryFindSpawnPositionAroundPoint(Vector3 groupPos, out Vector3 result)
    {
        Vector3 origin = (center == Vector3.zero) ? transform.position : center;

        for (int attempt = 0; attempt < 30; attempt++)
        {
            Vector2 dir2D = Random.insideUnitCircle.normalized;
            float dist = Random.Range(minSpawnDistanceFromPlayers, maxSpawnDistanceFromPlayers);
            Vector3 candidate = groupPos + new Vector3(dir2D.x, 0f, dir2D.y) * dist;

            if (Vector3.Distance(origin, candidate) > searchRadius)
                continue;

            if (TryProjectToGround(candidate, out Vector3 groundPos))
            {
                result = groundPos;
                return true;
            }
        }

        result = Vector3.zero;
        return false;
    }

    bool TryProjectToGround(Vector3 candidate, out Vector3 groundPos)
    {
        // STRATEGY 1: NavMesh
        if (NavMesh.SamplePosition(candidate, out NavMeshHit navHit, navmeshSampleRadius, NavMesh.AllAreas))
        {
            groundPos = navHit.position + Vector3.up * spawnHeightOffset;
            return true;
        }

        // STRATEGY 2: Raycast from high above
        Vector3 worldTop = new Vector3(candidate.x, maxRaycastHeight, candidate.z);
        if (Physics.Raycast(worldTop, Vector3.down, out RaycastHit hit, maxRaycastHeight * 2f, groundMask))
        {
            groundPos = hit.point + Vector3.up * spawnHeightOffset;
            return true;
        }

        // STRATEGY 3: Raycast from elevated candidate
        if (Physics.Raycast(candidate + Vector3.up * 50f, Vector3.down, out RaycastHit downHit, 100f, groundMask))
        {
            groundPos = downHit.point + Vector3.up * spawnHeightOffset;
            return true;
        }

        groundPos = Vector3.zero;
        return false;
    }

    void OnDrawGizmos()
    {
        if (!showDebugGizmos) return;

        Vector3 origin = (center == Vector3.zero) ? transform.position : center;

        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(origin, searchRadius);

        Gizmos.color = Color.cyan;
        Gizmos.DrawWireSphere(origin, minSpawnDistanceFromPlayers);

        Gizmos.color = Color.blue;
        Gizmos.DrawWireSphere(origin, maxSpawnDistanceFromPlayers);

        if (lastAttemptedSpawnPos != Vector3.zero)
        {
            Gizmos.color = Color.green;
            Gizmos.DrawWireSphere(lastAttemptedSpawnPos, 2f);
            Gizmos.DrawLine(lastAttemptedSpawnPos, lastAttemptedSpawnPos + Vector3.up * 5f);
        }

        if (currentImpostor != null && currentImpostor.IsSpawned)
        {
            Gizmos.color = Color.red;
            Gizmos.DrawWireSphere(currentImpostor.transform.position, 1.5f);
        }
    }
}
