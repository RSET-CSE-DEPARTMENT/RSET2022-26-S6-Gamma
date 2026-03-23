using Unity.Netcode;
using UnityEngine;
using System.Collections.Generic;
using System.Linq;

/// <summary>
/// Manages player groups based on proximity.
/// Groups are clusters of players within a certain radius.
/// FIXED: Now properly excludes impostor objects from group tracking
/// </summary>
public class PlayerGroupManager : NetworkBehaviour
{
    public static PlayerGroupManager Instance;

    [Header("Group Detection")]
    [Tooltip("Radius to detect if players are in same group (larger than chat radius)")]
    public float groupRadius = 12f;

    [Tooltip("How often to update groups (seconds)")]
    public float updateInterval = 1f;

    [Header("Debug")]
    public bool showDebugGizmos = true;
    public bool logGroupChanges = true;

    // Current active groups
    private List<PlayerGroup> activeGroups = new List<PlayerGroup>();
    private float lastUpdateTime;

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
        }
        else
        {
            Destroy(gameObject);
        }
    }

    void Update()
    {
        if (!IsServer) return;

        if (Time.time - lastUpdateTime >= updateInterval)
        {
            UpdateGroups();
            lastUpdateTime = Time.time;
        }
    }

    /// <summary>
    /// Detects and updates all player groups
    /// </summary>
    void UpdateGroups()
    {
        if (NetworkManager.Singleton == null) return;

        // Get all player positions
        List<PlayerInfo> players = GetAllPlayers();

        if (players.Count == 0)
        {
            activeGroups.Clear();
            return;
        }

        // Clear old groups
        List<PlayerGroup> newGroups = new List<PlayerGroup>();

        // Track which players have been assigned to a group
        HashSet<string> assignedPlayers = new HashSet<string>();

        // For each player, find all nearby players and form a group
        foreach (var player in players)
        {
            if (assignedPlayers.Contains(player.playerId))
                continue;

            // Find all players within group radius
            List<PlayerInfo> groupMembers = new List<PlayerInfo> { player };
            assignedPlayers.Add(player.playerId);

            foreach (var otherPlayer in players)
            {
                if (assignedPlayers.Contains(otherPlayer.playerId))
                    continue;

                float distance = Vector3.Distance(player.position, otherPlayer.position);
                if (distance <= groupRadius)
                {
                    groupMembers.Add(otherPlayer);
                    assignedPlayers.Add(otherPlayer.playerId);
                }
            }

            // Create group if we have members
            if (groupMembers.Count > 0)
            {
                PlayerGroup group = new PlayerGroup(groupMembers, groupRadius);
                newGroups.Add(group);
            }
        }

        // Log changes if enabled
        if (logGroupChanges && !GroupsEqual(activeGroups, newGroups))
        {
            Debug.Log($"═══════════════════════════════════════════════════");
            Debug.Log($"[GROUP UPDATE] Total Groups: {newGroups.Count}");
            Debug.Log($"═══════════════════════════════════════════════════");

            for (int i = 0; i < newGroups.Count; i++)
            {
                var g = newGroups[i];
                string groupType = g.playerIds.Count == 1 ? "SOLO" : "GROUP";
                Debug.Log($"📍 Group {i + 1} [{groupType}]:");
                Debug.Log($"   └─ Size: {g.playerIds.Count} player(s)");
                Debug.Log($"   └─ Location: {g.centerPosition:F1}");
                Debug.Log($"   └─ ID: {g.groupId}");
                Debug.Log($"   └─ Members: {string.Join(", ", g.playerIds)}");

                // Show distances between members if more than 1
                if (g.playerIds.Count > 1)
                {
                    var groupPlayers = GetAllPlayers().Where(p => g.playerIds.Contains(p.playerId)).ToList();
                    Debug.Log($"   └─ Member Distances:");
                    for (int j = 0; j < groupPlayers.Count - 1; j++)
                    {
                        for (int k = j + 1; k < groupPlayers.Count; k++)
                        {
                            float dist = Vector3.Distance(groupPlayers[j].position, groupPlayers[k].position);
                            Debug.Log($"      • {groupPlayers[j].playerId} ↔ {groupPlayers[k].playerId}: {dist:F2}m");
                        }
                    }
                }
                Debug.Log($"");
            }

            // Summary stats
            int totalPlayers = newGroups.Sum(g => g.playerIds.Count);
            int soloPlayers = newGroups.Count(g => g.playerIds.Count == 1);
            int groupedPlayers = totalPlayers - soloPlayers;

            Debug.Log($"[SUMMARY]");
            Debug.Log($"   └─ Total Players Tracked: {totalPlayers}");
            Debug.Log($"   └─ Solo Players: {soloPlayers}");
            Debug.Log($"   └─ Grouped Players: {groupedPlayers}");
            Debug.Log($"   └─ Active Groups (2+): {newGroups.Count - soloPlayers}");
            Debug.Log($"═══════════════════════════════════════════════════\n");
        }

        activeGroups = newGroups;
    }

    /// <summary>
    /// FIXED: Gets all current player objects from NetworkManager, excluding impostors
    /// </summary>
    List<PlayerInfo> GetAllPlayers()
    {
        List<PlayerInfo> players = new List<PlayerInfo>();

        foreach (var client in NetworkManager.Singleton.ConnectedClientsList)
        {
            if (client.PlayerObject == null) continue;

            // ✅ FIX #1: Skip impostor objects (they have ImpostorPlayerAI component)
            if (client.PlayerObject.GetComponent<ImpostorPlayerAI>() != null)
            {
                if (logGroupChanges)
                    Debug.Log($"[PlayerGroupManager] Skipping impostor: {client.PlayerObject.name}");
                continue;
            }

            // Only track real players with PlayerIdentity
            var identity = client.PlayerObject.GetComponent<PlayerIdentity>();
            if (identity == null)
            {
                if (logGroupChanges)
                    Debug.Log($"[PlayerGroupManager] Skipping object without PlayerIdentity: {client.PlayerObject.name}");
                continue;
            }

            string displayName = identity.GetDisplayName();

            // ✅ FIX #2: Validate display name
            if (string.IsNullOrEmpty(displayName) || displayName == "Player" || displayName == "0")
            {
                if (logGroupChanges)
                    Debug.LogWarning($"[PlayerGroupManager] Invalid display name: '{displayName}' for client {client.ClientId}");
                continue;
            }

            players.Add(new PlayerInfo
            {
                playerId = displayName,
                clientId = client.ClientId,
                position = client.PlayerObject.transform.position,
                playerObject = client.PlayerObject
            });
        }

        if (logGroupChanges && players.Count > 0)
        {
            Debug.Log($"[PlayerGroupManager] ✅ Found {players.Count} valid players: {string.Join(", ", players.Select(p => p.playerId))}");
        }

        return players;
    }

    /// <summary>
    /// Gets all current groups
    /// </summary>
    public List<PlayerGroup> GetActiveGroups()
    {
        return new List<PlayerGroup>(activeGroups);
    }

    /// <summary>
    /// Gets the group a specific player is in (null if solo)
    /// </summary>
    public PlayerGroup GetPlayerGroup(string playerId)
    {
        return activeGroups.FirstOrDefault(g => g.playerIds.Contains(playerId));
    }

    /// <summary>
    /// Gets the smallest group (for impostor targeting)
    /// </summary>
    public PlayerGroup GetSmallestGroup()
    {
        if (activeGroups.Count == 0) return null;
        return activeGroups.OrderBy(g => g.playerIds.Count).First();
    }

    /// <summary>
    /// Gets the farthest group from a given position
    /// </summary>
    public PlayerGroup GetFarthestGroup(Vector3 fromPosition, PlayerGroup excludeGroup = null)
    {
        if (activeGroups.Count == 0) return null;

        return activeGroups
            .Where(g => excludeGroup == null || g != excludeGroup)
            .OrderByDescending(g => Vector3.Distance(fromPosition, g.centerPosition))
            .FirstOrDefault();
    }

    /// <summary>
    /// Gets the farthest group with priority for smaller groups
    /// </summary>
    public PlayerGroup GetTargetGroupForImpostor(Vector3 impostorPosition, PlayerGroup lastTargetGroup = null)
    {
        if (activeGroups.Count == 0) return null;

        // Filter out last target group
        var candidateGroups = activeGroups
            .Where(g => lastTargetGroup == null || g != lastTargetGroup)
            .ToList();

        if (candidateGroups.Count == 0) return null;

        // Score groups: farther distance + smaller size = higher priority
        return candidateGroups
            .OrderByDescending(g =>
            {
                float distance = Vector3.Distance(impostorPosition, g.centerPosition);
                float sizeBonus = (10f / g.playerIds.Count); // Smaller groups get higher bonus
                return distance + sizeBonus * 5f; // Weight distance more heavily
            })
            .First();
    }

    /// <summary>
    /// Gets players in a different group (for disguise selection)
    /// </summary>
    public List<string> GetPlayersNotInGroup(PlayerGroup targetGroup)
    {
        List<string> allPlayers = GetAllPlayers().Select(p => p.playerId).ToList();
        return allPlayers.Except(targetGroup.playerIds).ToList();
    }

    bool GroupsEqual(List<PlayerGroup> a, List<PlayerGroup> b)
    {
        if (a.Count != b.Count) return false;

        // Simple equality check - just compare group sizes and positions
        for (int i = 0; i < a.Count; i++)
        {
            if (a[i].playerIds.Count != b[i].playerIds.Count)
                return false;
        }

        return true;
    }

    void OnDrawGizmos()
    {
        if (!showDebugGizmos || activeGroups == null) return;

        Color[] colors = { Color.red, Color.blue, Color.green, Color.yellow, Color.cyan, Color.magenta };

        for (int i = 0; i < activeGroups.Count; i++)
        {
            var group = activeGroups[i];
            Color groupColor = colors[i % colors.Length];

            // Draw group radius
            Gizmos.color = new Color(groupColor.r, groupColor.g, groupColor.b, 0.3f);
            Gizmos.DrawWireSphere(group.centerPosition, groupRadius);

            // Draw center point
            Gizmos.color = groupColor;
            Gizmos.DrawSphere(group.centerPosition, 0.5f);

            // Draw lines to members
            foreach (var playerId in group.playerIds)
            {
                var players = GetAllPlayers();
                var player = players.FirstOrDefault(p => p.playerId == playerId);
                if (!string.IsNullOrEmpty(player.playerId)) // Check if player was found
                {
                    Gizmos.DrawLine(group.centerPosition, player.position);
                }
            }
        }
    }
}

/// <summary>
/// Represents a group of players
/// </summary>
[System.Serializable]
public class PlayerGroup
{
    public List<string> playerIds;
    public Vector3 centerPosition;
    public float radius;
    public string groupId; // Unique identifier for this group instance

    public PlayerGroup(List<PlayerInfo> members, float groupRadius)
    {
        playerIds = members.Select(m => m.playerId).ToList();
        radius = groupRadius;

        // Calculate center as average position
        if (members.Count > 0)
        {
            Vector3 sum = Vector3.zero;
            foreach (var m in members)
                sum += m.position;
            centerPosition = sum / members.Count;
        }

        // Generate unique ID based on members
        groupId = $"group_{string.Join("_", playerIds.OrderBy(x => x))}";
    }

    public int Size => playerIds.Count;

    public override string ToString()
    {
        return $"Group[{playerIds.Count}] at {centerPosition:F1}: {string.Join(", ", playerIds)}";
    }
}

/// <summary>
/// Helper struct for player info
/// </summary>
public struct PlayerInfo
{
    public string playerId;
    public ulong clientId;
    public Vector3 position;
    public NetworkObject playerObject;
}