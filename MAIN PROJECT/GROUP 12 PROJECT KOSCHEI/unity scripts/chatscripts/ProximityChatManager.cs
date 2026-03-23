using Unity.Netcode;
using UnityEngine;
using System.Collections.Generic;
using System.Collections;

public class ProximityChatManager : NetworkBehaviour
{
    public static ProximityChatManager Instance;

    [Header("UI")]
    public GameObject chatMessagePrefab;
    public Transform chatContainer;
    public int maxMessages = 10;

    [Header("Proximity settings")]
    public float chatRadius = 15f;

    [Header("Group Integration")]
    public PlayerGroupManager groupManager;

    [Header("Backend Integration")]
    public ProximityChatInput chatInput;  // Reference to send backend requests

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
        }
        else
        {
            Destroy(gameObject);
            return;
        }

        if (chatContainer != null)
        {
            RectTransform rt = chatContainer.GetComponent<RectTransform>();
            rt.anchorMin = new Vector2(0, 0);
            rt.anchorMax = new Vector2(0, 0);
            rt.pivot = new Vector2(0, 0);
            rt.anchoredPosition = new Vector2(20, 40);
        }
    }

    /// <summary>
    /// Adds a message to the local UI only (no networking)
    /// </summary>
    public void AddMessageLocal(string playerName, string message, Color nameColor)
    {
        if (chatMessagePrefab == null || chatContainer == null) return;

        GameObject obj = Instantiate(chatMessagePrefab, chatContainer);
        obj.SetActive(true);

        ProximityChatMessage msg = obj.GetComponent<ProximityChatMessage>();
        if (msg != null)
        {
            msg.Setup(playerName, message, nameColor);
        }

        // Clean up old messages
        while (chatContainer.childCount > maxMessages)
        {
            Transform oldestChild = chatContainer.GetChild(0);
            if (oldestChild != null)
            {
                Destroy(oldestChild.gameObject);
            }
        }
    }

    /// <summary>
    /// Backwards compatible wrapper for AddMessageLocal
    /// </summary>
    public void AddMessage(string playerName, string message, Color nameColor)
    {
        AddMessageLocal(playerName, message, nameColor);
    }

    /// <summary>
    /// NEW: Combined ServerRpc that handles BOTH proximity chat AND backend notification
    /// Server determines the correct group and sends to backend
    /// </summary>
    [ServerRpc(RequireOwnership = false)]
    public void SendChatMessageWithBackendServerRpc(string fromName, string message, Color nameColor, ServerRpcParams serverRpcParams = default)
    {
        // Validate inputs
        if (string.IsNullOrWhiteSpace(message) || string.IsNullOrWhiteSpace(fromName))
        {
            Debug.LogWarning("Invalid chat message received");
            return;
        }

        // Limit message length
        if (message.Length > 200)
        {
            message = message.Substring(0, 200);
        }

        if (NetworkManager.Singleton == null) return;

        // Get the sender's actual position from server (don't trust client)
        ulong senderClientId = serverRpcParams.Receive.SenderClientId;

        if (!NetworkManager.Singleton.ConnectedClients.TryGetValue(senderClientId, out var senderClient))
        {
            Debug.LogWarning($"Sender client {senderClientId} not found");
            return;
        }

        if (senderClient.PlayerObject == null)
        {
            Debug.LogWarning($"Sender client {senderClientId} has no player object");
            return;
        }

        Vector3 senderPosition = senderClient.PlayerObject.transform.position;

        // CRITICAL: Get sender's group info ON THE SERVER (authoritative)
        string senderGroupId = "solo";
        if (groupManager != null)
        {
            var group = groupManager.GetPlayerGroup(fromName);
            if (group != null)
            {
                senderGroupId = group.groupId;
                Debug.Log($"[SERVER-Chat] {fromName} is in {senderGroupId} with {group.playerIds.Count} members");
            }
            else
            {
                Debug.Log($"[SERVER-Chat] {fromName} is solo (no group found)");
            }
        }

        // Find all clients within proximity radius for chat display
        List<ulong> nearbyClientIds = new List<ulong>();

        foreach (var kvp in NetworkManager.Singleton.ConnectedClients)
        {
            var client = kvp.Value;
            if (client.PlayerObject == null) continue;

            float distance = Vector3.Distance(senderPosition, client.PlayerObject.transform.position);

            if (distance <= chatRadius)
            {
                nearbyClientIds.Add(kvp.Key);
            }
        }

        // Send message only to nearby clients for display
        if (nearbyClientIds.Count > 0)
        {
            ClientRpcParams clientRpcParams = new ClientRpcParams
            {
                Send = new ClientRpcSendParams
                {
                    TargetClientIds = nearbyClientIds.ToArray()
                }
            };

            ReceiveChatMessageClientRpc(fromName, message, nameColor, clientRpcParams);
        }

        // Send to backend with CORRECT group info (determined by server)
        if (chatInput != null)
        {
            StartCoroutine(chatInput.SendMessageToBackend(fromName, message, senderGroupId));
        }
        else
        {
            Debug.LogWarning("[SERVER-Chat] No chatInput reference to send to backend!");
        }
    }

    /// <summary>
    /// OLD: Original ServerRpc for backwards compatibility (doesn't send to backend)
    /// </summary>
    [ServerRpc(RequireOwnership = false)]
    public void SendChatMessageServerRpc(string fromName, string message, Color nameColor, ServerRpcParams serverRpcParams = default)
    {
        // Validate inputs
        if (string.IsNullOrWhiteSpace(message) || string.IsNullOrWhiteSpace(fromName))
        {
            Debug.LogWarning("Invalid chat message received");
            return;
        }

        // Limit message length
        if (message.Length > 200)
        {
            message = message.Substring(0, 200);
        }

        if (NetworkManager.Singleton == null) return;

        // Get the sender's actual position from server (don't trust client)
        ulong senderClientId = serverRpcParams.Receive.SenderClientId;

        if (!NetworkManager.Singleton.ConnectedClients.TryGetValue(senderClientId, out var senderClient))
        {
            Debug.LogWarning($"Sender client {senderClientId} not found");
            return;
        }

        if (senderClient.PlayerObject == null)
        {
            Debug.LogWarning($"Sender client {senderClientId} has no player object");
            return;
        }

        Vector3 senderPosition = senderClient.PlayerObject.transform.position;

        // Find all clients within proximity radius
        List<ulong> nearbyClientIds = new List<ulong>();

        foreach (var kvp in NetworkManager.Singleton.ConnectedClients)
        {
            var client = kvp.Value;
            if (client.PlayerObject == null) continue;

            float distance = Vector3.Distance(senderPosition, client.PlayerObject.transform.position);

            if (distance <= chatRadius)
            {
                nearbyClientIds.Add(kvp.Key);
            }
        }

        // Send message only to nearby clients
        if (nearbyClientIds.Count > 0)
        {
            ClientRpcParams clientRpcParams = new ClientRpcParams
            {
                Send = new ClientRpcSendParams
                {
                    TargetClientIds = nearbyClientIds.ToArray()
                }
            };

            ReceiveChatMessageClientRpc(fromName, message, nameColor, clientRpcParams);
        }
    }

    /// <summary>
    /// Runs on targeted clients only to display the message
    /// </summary>
    [ClientRpc]
    private void ReceiveChatMessageClientRpc(string fromName, string message, Color nameColor, ClientRpcParams clientRpcParams = default)
    {
        AddMessageLocal(fromName, message, nameColor);
    }

    /// <summary>
    /// Special method for server-controlled entities (like AI aliens) to broadcast messages
    /// Call this only on the server
    /// </summary>
    public void BroadcastMessageFromServer(string fromName, string message, Vector3 worldPos, Color nameColor)
    {
        if (!IsServer)
        {
            Debug.LogWarning("BroadcastMessageFromServer should only be called on server");
            return;
        }

        if (NetworkManager.Singleton == null) return;

        List<ulong> nearbyClientIds = new List<ulong>();
        foreach (var kvp in NetworkManager.Singleton.ConnectedClients)
        {
            var client = kvp.Value;
            if (client.PlayerObject == null) continue;

            float distance = Vector3.Distance(worldPos, client.PlayerObject.transform.position);
            if (distance <= chatRadius)
            {
                nearbyClientIds.Add(kvp.Key);
            }
        }

        if (nearbyClientIds.Count > 0)
        {
            ClientRpcParams clientRpcParams = new ClientRpcParams
            {
                Send = new ClientRpcSendParams
                {
                    TargetClientIds = nearbyClientIds.ToArray()
                }
            };

            ReceiveChatMessageClientRpc(fromName, message, nameColor, clientRpcParams);
        }
    }

    /// <summary>
    /// Broadcasts an impostor message from any client through the server
    /// This ensures all nearby players see the impostor's message
    /// </summary>
    [ServerRpc(RequireOwnership = false)]
    public void BroadcastImpostorMessageServerRpc(string fromName, string message, Color nameColor, ServerRpcParams serverRpcParams = default)
    {
        // Validate inputs
        if (string.IsNullOrWhiteSpace(message) || string.IsNullOrWhiteSpace(fromName))
        {
            Debug.LogWarning("Invalid impostor message received");
            return;
        }

        // Limit message length
        if (message.Length > 200)
        {
            message = message.Substring(0, 200);
        }

        if (NetworkManager.Singleton == null) return;

        // Get the client who triggered this (the player whose message caused impostor to respond)
        ulong triggerClientId = serverRpcParams.Receive.SenderClientId;

        if (!NetworkManager.Singleton.ConnectedClients.TryGetValue(triggerClientId, out var triggerClient))
        {
            Debug.LogWarning($"Trigger client {triggerClientId} not found");
            return;
        }

        if (triggerClient.PlayerObject == null)
        {
            Debug.LogWarning($"Trigger client {triggerClientId} has no player object");
            return;
        }

        // Use the trigger client's position as the "source" of the impostor message
        // (impostor appears to be "near" whoever just spoke)
        Vector3 messageOriginPosition = triggerClient.PlayerObject.transform.position;

        // Find all clients within proximity radius
        List<ulong> nearbyClientIds = new List<ulong>();
        foreach (var kvp in NetworkManager.Singleton.ConnectedClients)
        {
            var client = kvp.Value;
            if (client.PlayerObject == null) continue;

            float distance = Vector3.Distance(messageOriginPosition, client.PlayerObject.transform.position);
            if (distance <= chatRadius)
            {
                nearbyClientIds.Add(kvp.Key);
            }
        }

        // Send message only to nearby clients
        if (nearbyClientIds.Count > 0)
        {
            ClientRpcParams clientRpcParams = new ClientRpcParams
            {
                Send = new ClientRpcSendParams
                {
                    TargetClientIds = nearbyClientIds.ToArray()
                }
            };

            ReceiveChatMessageClientRpc(fromName, message, nameColor, clientRpcParams);
        }

        Debug.Log($"Broadcasted impostor message '{fromName}: {message}' to {nearbyClientIds.Count} nearby clients");
    }
}