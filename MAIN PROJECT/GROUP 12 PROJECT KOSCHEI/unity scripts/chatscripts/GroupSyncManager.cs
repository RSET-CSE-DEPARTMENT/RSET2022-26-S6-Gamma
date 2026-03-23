using Unity.Netcode;
using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

/// <summary>
/// Syncs PlayerGroupManager state to backend continuously.
/// Attach this to the same GameObject as PlayerGroupManager.
/// SERVER ONLY - runs on host/server to keep backend updated.
/// </summary>
public class GroupSyncManager : NetworkBehaviour
{
    [Header("References")]
    public PlayerGroupManager groupManager;

    [Header("Backend Settings")]
    public string backendUrlOverride;
    public int backendPort = 8000;
    public float syncInterval = 2f; // Sync every 2 seconds

    [Header("Debug")]
    public bool showDebugLogs = true;

    private string ResolvedBackendUrl
    {
        get
        {
            if (!string.IsNullOrEmpty(backendUrlOverride))
                return backendUrlOverride;
            
            return NetworkHostAddressHelper.GetChatApiUrlFromNetworkManager(backendPort, "");
        }
    }

    private List<PlayerGroup> lastSyncedGroups = new List<PlayerGroup>();
    private float lastSyncTime = 0f;

    void Update()
    {
        // Only run on server
        if (!IsServer) return;
        
        // Check if it's time to sync
        if (Time.time - lastSyncTime >= syncInterval)
        {
            SyncGroupsToBackend();
            lastSyncTime = Time.time;
        }
    }

    void SyncGroupsToBackend()
    {
        if (groupManager == null)
        {
            Debug.LogWarning("[GroupSync] No PlayerGroupManager assigned!");
            return;
        }

        var currentGroups = groupManager.GetActiveGroups();
        
        // Check if groups have changed since last sync
        if (!GroupsChanged(lastSyncedGroups, currentGroups))
        {
            // No changes, skip sync
            return;
        }

        if (showDebugLogs)
        {
            Debug.Log($"[GroupSync] 📡 Syncing {currentGroups.Count} groups to backend");
        }

        StartCoroutine(SendGroupUpdateToBackend(currentGroups));
        
        // Store current state for next comparison
        lastSyncedGroups = new List<PlayerGroup>(currentGroups);
    }

    bool GroupsChanged(List<PlayerGroup> oldGroups, List<PlayerGroup> newGroups)
    {
        // Different number of groups
        if (oldGroups.Count != newGroups.Count)
            return true;

        // Check if group compositions changed
        var oldGroupIds = oldGroups.Select(g => g.groupId).OrderBy(x => x).ToList();
        var newGroupIds = newGroups.Select(g => g.groupId).OrderBy(x => x).ToList();

        if (!oldGroupIds.SequenceEqual(newGroupIds))
            return true;

        // Check if member counts changed
        for (int i = 0; i < oldGroups.Count; i++)
        {
            if (oldGroups[i].playerIds.Count != newGroups[i].playerIds.Count)
                return true;
        }

        return false;
    }

    IEnumerator SendGroupUpdateToBackend(List<PlayerGroup> groups)
    {
        string url = ResolvedBackendUrl;
        if (string.IsNullOrEmpty(url))
        {
            Debug.LogWarning("[GroupSync] Could not resolve backend URL");
            yield break;
        }

        // Ensure HTTP for local development
        if (url.StartsWith("https://127.0.0.1") || url.StartsWith("https://localhost"))
        {
            url = url.Replace("https://", "http://");
        }

        string syncUrl = url.TrimEnd('/') + "/groups/sync";

        // Build payload
        var payload = new GroupSyncPayload
        {
            groups = groups.Select(g => new GroupData
            {
                group_id = g.groupId,
                player_ids = g.playerIds.ToArray(),
                center_position = new float[] { g.centerPosition.x, g.centerPosition.y, g.centerPosition.z },
                size = g.playerIds.Count
            }).ToArray(),
            timestamp = System.DateTime.UtcNow.ToString("o")
        };

        string json = JsonUtility.ToJson(payload);

        using (UnityWebRequest req = new UnityWebRequest(syncUrl, "POST"))
        {
            byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(json);
            req.uploadHandler = new UploadHandlerRaw(bodyRaw);
            req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json");

            yield return req.SendWebRequest();

            if (req.result == UnityWebRequest.Result.Success)
            {
                if (showDebugLogs)
                {
                    Debug.Log($"[GroupSync] ✅ Synced {groups.Count} groups successfully");
                    foreach (var g in groups)
                    {
                        Debug.Log($"   • {g.groupId}: {string.Join(", ", g.playerIds)}");
                    }
                }
            }
            else
            {
                Debug.LogWarning($"[GroupSync] ⚠️ Sync failed: {req.error}");
            }
        }
    }

    /// <summary>
    /// Force immediate sync (useful for testing)
    /// </summary>
    [ContextMenu("Force Sync Now")]
    public void ForceSyncNow()
    {
        if (!IsServer)
        {
            Debug.LogWarning("[GroupSync] Must be called on server");
            return;
        }

        SyncGroupsToBackend();
    }
}

[System.Serializable]
public class GroupSyncPayload
{
    public GroupData[] groups;
    public string timestamp;
}

[System.Serializable]
public class GroupData
{
    public string group_id;
    public string[] player_ids;
    public float[] center_position;
    public int size;
}