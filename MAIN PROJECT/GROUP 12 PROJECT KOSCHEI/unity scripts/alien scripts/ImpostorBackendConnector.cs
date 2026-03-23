using System.Collections;
using System.Collections.Generic;
using Unity.Netcode;
using UnityEngine;
using UnityEngine.Networking;

/// <summary>
/// Handles communication between Unity and FastAPI backend for impostor spawning/despawning.
/// Impostor spawning is GATED by game phase -- only active between Briefing and BossFight.
/// </summary>
public class ImpostorBackendConnector : NetworkBehaviour
{
    [Header("Backend Settings")]
    public string backendUrl = "http://127.0.0.1:8000";
    public float checkSpawnInterval = 5f;
    public float groupUpdateInterval = 2f;

    [Header("Despawn Settings")]
    public float walkAwayDistance = 30f;
    public float maxWalkAwayTime = 15f;

    [Header("References")]
    public ImpostorAlienSpawner spawner;
    public GroupSyncManager groupSyncManager;
    public PlayerGroupManager playerGroupManager;

    [Header("Debug")]
    public bool showDebugLogs = true;

    private bool isCheckingSpawn = false;
    private bool isWalkingAway = false;
    private bool isImpostorEnabled = false;
    private string currentTargetGroupId = null;
    private string currentDisguiseAs = null;

    void Start()
    {
        if (spawner == null)
            spawner = FindObjectOfType<ImpostorAlienSpawner>();

        if (groupSyncManager == null)
            groupSyncManager = FindObjectOfType<GroupSyncManager>();

        if (playerGroupManager == null)
            playerGroupManager = FindObjectOfType<PlayerGroupManager>();

        if (spawner != null)
            spawner.backendConnector = this;
    }

    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();

        if (IsServer)
        {
            StartCoroutine(CheckSpawnRoutine());
            StartCoroutine(UpdateImpostorTargetRoutine());
        }
    }

    // ----------------------------------------------------------------
    // Phase Gating -- called by TaskManager
    // ----------------------------------------------------------------

    /// <summary>
    /// Call this when players complete the Briefing (NPC2 dialogue done).
    /// Impostor can now be spawned by the backend.
    /// </summary>
    public void EnableImpostorSpawning()
    {
        isImpostorEnabled = true;
        Debug.Log("[ImpostorBackend] Impostor spawning ENABLED (Briefing complete).");
    }

    /// <summary>
    /// Call this when the Boss Fight begins (or on game over).
    /// Immediately despawns any active impostor and blocks future spawns.
    /// </summary>
    public void DisableImpostorSpawning()
    {
        isImpostorEnabled = false;
        Debug.Log("[ImpostorBackend] Impostor spawning DISABLED (Boss Fight / Game Over).");

        // Despawn active impostor if one exists
        if (spawner != null)
        {
            NetworkObject impostor = spawner.GetCurrentImpostor();
            if (impostor != null && impostor.IsSpawned && !isWalkingAway)
            {
                Debug.Log("[ImpostorBackend] Forcing impostor despawn due to phase change.");
                StartCoroutine(WalkAwayAndDespawn());
            }
        }
    }

    // ----------------------------------------------------------------
    // Continuously update impostor target position
    // ----------------------------------------------------------------

    IEnumerator UpdateImpostorTargetRoutine()
    {
        while (true)
        {
            yield return new WaitForSeconds(groupUpdateInterval);

            if (isWalkingAway || !isImpostorEnabled) continue;

            if (currentTargetGroupId != null && spawner != null)
            {
                NetworkObject impostor = spawner.GetCurrentImpostor();

                if (impostor != null && impostor.IsSpawned)
                {
                    Vector3 currentGroupCenter = GetCurrentGroupCenter(currentTargetGroupId);

                    if (currentGroupCenter != Vector3.zero)
                    {
                        ImpostorPlayerAI ai = impostor.GetComponent<ImpostorPlayerAI>();
                        if (ai != null)
                        {
                            string[] groupMembers = GetCurrentGroupMembers(currentTargetGroupId);
                            ai.UpdateTargetGroupPosition(currentGroupCenter, groupMembers);

                            if (showDebugLogs)
                                Debug.Log($"[ImpostorBackend] Updated impostor target: {currentGroupCenter:F1}");
                        }
                    }
                }
            }
        }
    }

    Vector3 GetCurrentGroupCenter(string groupId)
    {
        if (playerGroupManager == null) return Vector3.zero;

        var activeGroups = playerGroupManager.GetActiveGroups();
        foreach (var group in activeGroups)
        {
            if (group.groupId == groupId)
                return group.centerPosition;
        }

        if (showDebugLogs)
            Debug.LogWarning($"[ImpostorBackend] Group '{groupId}' not found in active groups");

        return Vector3.zero;
    }

    string[] GetCurrentGroupMembers(string groupId)
    {
        if (playerGroupManager == null) return new string[0];

        var activeGroups = playerGroupManager.GetActiveGroups();
        foreach (var group in activeGroups)
        {
            if (group.groupId == groupId)
                return group.playerIds.ToArray();
        }

        return new string[0];
    }

    // ----------------------------------------------------------------
    // Spawn Polling
    // ----------------------------------------------------------------

    IEnumerator CheckSpawnRoutine()
    {
        while (true)
        {
            yield return new WaitForSeconds(checkSpawnInterval);

            if (!isCheckingSpawn && spawner != null && isImpostorEnabled)
                StartCoroutine(CheckSpawnWithBackend());
        }
    }

    IEnumerator CheckSpawnWithBackend()
    {
        // Guard: do not spawn if phase gate is closed
        if (!isImpostorEnabled)
        {
            isCheckingSpawn = false;
            yield break;
        }

        isCheckingSpawn = true;

        string url = $"{backendUrl}/impostor/check_spawn";

        using (UnityWebRequest request = UnityWebRequest.Get(url))
        {
            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                string json = request.downloadHandler.text;
                SpawnCheckResponse response = JsonUtility.FromJson<SpawnCheckResponse>(json);

                if (response.should_despawn && !isWalkingAway)
                {
                    if (showDebugLogs)
                        Debug.Log($"[ImpostorBackend] Backend says: DESPAWN (reason: {response.reason})");

                    StartCoroutine(WalkAwayAndDespawn());
                }
                else if (response.should_spawn && !string.IsNullOrEmpty(response.disguise_as) && isImpostorEnabled)
                {
                    if (showDebugLogs)
                    {
                        Debug.Log($"[ImpostorBackend] ═══════════════════════════════════");
                        Debug.Log($"[ImpostorBackend] Backend says: SPAWN IMPOSTOR");
                        Debug.Log($"[ImpostorBackend] Target Group: {response.target_group_id}");
                        Debug.Log($"[ImpostorBackend] Disguise As: {response.disguise_as}");
                        Debug.Log($"[ImpostorBackend] ═══════════════════════════════════");
                    }

                    Vector3 groupCenter = new Vector3(
                        response.target_group_position[0],
                        response.target_group_position[1],
                        response.target_group_position[2]
                    );

                    spawner.SpawnImpostorForGroup(
                        response.target_group_id,
                        response.target_group_members,
                        groupCenter,
                        response.disguise_as
                    );

                    currentTargetGroupId = response.target_group_id;
                    currentDisguiseAs = response.disguise_as;
                }
            }
            else
            {
                Debug.LogWarning($"[ImpostorBackend] Failed to check spawn: {request.error}");
            }
        }

        isCheckingSpawn = false;
    }

    // ----------------------------------------------------------------
    // Walk Away & Despawn
    // ----------------------------------------------------------------

    IEnumerator WalkAwayAndDespawn()
    {
        isWalkingAway = true;

        NetworkObject impostor = spawner?.GetCurrentImpostor();

        if (impostor != null && impostor.IsSpawned)
        {
            ImpostorPlayerAI ai = impostor.GetComponent<ImpostorPlayerAI>();

            if (ai != null)
            {
                if (showDebugLogs)
                    Debug.Log("[ImpostorBackend] Impostor walking away...");

                ai.LeaveArea();

                Vector3 startPosition = impostor.transform.position;
                float distanceTraveled = 0f;
                float elapsedTime = 0f;

                while (distanceTraveled < walkAwayDistance &&
                       elapsedTime < maxWalkAwayTime &&
                       impostor != null &&
                       impostor.IsSpawned)
                {
                    distanceTraveled = Vector3.Distance(startPosition, impostor.transform.position);
                    elapsedTime += 0.5f;
                    yield return new WaitForSeconds(0.5f);
                }

                if (showDebugLogs)
                {
                    if (distanceTraveled >= walkAwayDistance)
                        Debug.Log($"[ImpostorBackend] Impostor reached leave distance: {distanceTraveled:F1}m");
                    else
                        Debug.LogWarning($"[ImpostorBackend] Walk-away timeout after {elapsedTime:F1}s");
                }
            }
        }

        if (showDebugLogs)
            Debug.Log("[ImpostorBackend] Despawning impostor now.");

        spawner?.DespawnCurrentImpostor();
        currentTargetGroupId = null;
        currentDisguiseAs = null;
        isWalkingAway = false;
    }

    // ----------------------------------------------------------------
    // Called by spawner after impostor spawns
    // ----------------------------------------------------------------

    public void OnImpostorSpawned(NetworkObject impostorNetObj, string targetGroupId, string disguiseAs)
    {
        if (showDebugLogs)
            Debug.Log("[ImpostorBackend] Impostor spawned, activating backend...");

        currentTargetGroupId = targetGroupId;
        currentDisguiseAs = disguiseAs;
        isWalkingAway = false;

        StartCoroutine(ActivateImpostorBackend(targetGroupId, disguiseAs));
    }

    IEnumerator ActivateImpostorBackend(string targetGroupId, string disguiseAs)
    {
        string url = $"{backendUrl}/impostor/activate";

        ActivateRequest data = new ActivateRequest
        {
            target_player_id = disguiseAs,
            target_group_id = targetGroupId,
            engagement_rate = 0.4f
        };

        string json = JsonUtility.ToJson(data);

        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(json);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                if (showDebugLogs)
                    Debug.Log($"[ImpostorBackend] Backend impostor activated as {disguiseAs}");
            }
            else
            {
                Debug.LogError($"[ImpostorBackend] Failed to activate backend: {request.error}");
            }
        }
    }

    // ----------------------------------------------------------------
    // Notify backend when impostor despawns
    // ----------------------------------------------------------------

    public void NotifyImpostorDespawned()
    {
        if (showDebugLogs)
            Debug.Log("[ImpostorBackend] Notifying backend of despawn...");

        currentTargetGroupId = null;
        currentDisguiseAs = null;
        isWalkingAway = false;

        StartCoroutine(DeactivateImpostorBackend());
    }

    IEnumerator DeactivateImpostorBackend()
    {
        string url = $"{backendUrl}/impostor/deactivate";

        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                if (showDebugLogs)
                    Debug.Log("[ImpostorBackend] Backend impostor deactivated.");
            }
            else
            {
                Debug.LogWarning($"[ImpostorBackend] Failed to deactivate backend: {request.error}");
            }
        }
    }

    // ----------------------------------------------------------------
    // Data Classes
    // ----------------------------------------------------------------

    [System.Serializable]
    public class SpawnCheckResponse
    {
        public bool should_spawn;
        public bool should_despawn;
        public string reason;
        public string target_group_id;
        public float[] target_group_position;
        public string[] target_group_members;
        public string disguise_as;
        public float engagement_rate;
        public float conversation_duration;
    }

    [System.Serializable]
    public class ActivateRequest
    {
        public string target_player_id;
        public string target_group_id;
        public float engagement_rate;
    }
}
