using UnityEngine;
using TMPro;
using UnityEngine.Networking;
using System.Collections;
using System;
using Unity.Netcode;

[Serializable]
public class ChatPayload
{
    public string player_id;
    public string message;
}

[Serializable]
public class ChatPayloadWithGroup
{
    public string player_id;
    public string message;
    public string group_id;  // Track which group message is from
}

[Serializable]
public class ImpostorMessage
{
    public string player_id;
    public string message;
    public string timestamp;
}

[Serializable]
public class ChatResponse
{
    public string player_id;
    public string message;
    public string timestamp;
    public ImpostorMessage impostor_message;
}

public class ProximityChatInput : MonoBehaviour
{
    public TMP_InputField inputField;
    public ProximityChatManager chatManager;

    [Header("API Settings (optional override)")]
    [Tooltip("If empty, we derive the URL from NetworkManager's UnityTransport address/port")]
    public string apiUrlOverride;
    public int backendPort = 8000;
    public string backendPath = "/chat";

    string ResolvedApiUrl
    {
        get
        {
            if (!string.IsNullOrEmpty(apiUrlOverride))
                return apiUrlOverride;

            // Derive from NetworkManager / UnityTransport
            return NetworkHostAddressHelper.GetChatApiUrlFromNetworkManager(backendPort, backendPath);
        }
    }

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.Return))
        {
            if (!string.IsNullOrWhiteSpace(inputField.text))
            {
                string text = inputField.text.Trim();

                var localIdentity = PlayerIdentity.Local;
                if (localIdentity == null)
                {
                    Debug.LogWarning("No PlayerIdentity.Local found yet.");
                    return;
                }

                string displayName = localIdentity.GetDisplayName();

                if (NetworkManager.Singleton != null &&
                    NetworkManager.Singleton.IsClient &&
                    NetworkManager.Singleton.IsConnectedClient)
                {
                    // Send through server - it will handle BOTH proximity chat AND backend notification
                    // Server has the authoritative group information
                    chatManager.SendChatMessageWithBackendServerRpc(displayName, text, Color.green);
                }
                else
                {
                    chatManager.AddMessage(displayName, text, Color.green);
                }

                inputField.text = "";
                inputField.DeactivateInputField();
            }
            else
            {
                inputField.ActivateInputField();
            }
        }
    }

    /// <summary>
    /// Called BY THE SERVER to send message to backend with correct group info
    /// Server has authoritative group data
    /// </summary>
    public IEnumerator SendMessageToBackend(string playerDisplayName, string message, string groupId)
    {
        string url = ResolvedApiUrl;
        if (string.IsNullOrEmpty(url))
        {
            Debug.LogWarning("ProximityChatInput: could not resolve backend URL from NetworkManager; skipping LLM call.");
            yield break;
        }

        // Ensure URL uses HTTP (not HTTPS) for local development
        if (url.StartsWith("https://127.0.0.1") || url.StartsWith("https://localhost"))
        {
            url = url.Replace("https://", "http://");
            Debug.Log($"Converted HTTPS to HTTP for local development: {url}");
        }

        ChatPayloadWithGroup payload = new ChatPayloadWithGroup
        {
            player_id = playerDisplayName,
            message = message,
            group_id = groupId
        };

        string json = JsonUtility.ToJson(payload);

        Debug.Log($"📤 Sending message to backend: player='{playerDisplayName}' group='{groupId}' msg='{message}'");

        using (UnityWebRequest req = new UnityWebRequest(url, "POST"))
        {
            byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(json);
            req.uploadHandler = new UploadHandlerRaw(bodyRaw);
            req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json");

            yield return req.SendWebRequest();

            if (req.result == UnityWebRequest.Result.Success)
            {
                try
                {
                    ChatResponse resp = JsonUtility.FromJson<ChatResponse>(req.downloadHandler.text);

                    // Check if impostor sent a message
                    if (resp.impostor_message != null && !string.IsNullOrEmpty(resp.impostor_message.message))
                    {
                        // Broadcast impostor message through the server
                        if (NetworkManager.Singleton != null &&
                            NetworkManager.Singleton.IsServer &&
                            chatManager != null)
                        {
                            // Get impostor message position (use player's position for proximity)
                            Vector3 messageOrigin = Vector3.zero;
                            foreach (var client in NetworkManager.Singleton.ConnectedClientsList)
                            {
                                if (client.PlayerObject != null)
                                {
                                    var identity = client.PlayerObject.GetComponent<PlayerIdentity>();
                                    if (identity != null && identity.GetDisplayName() == playerDisplayName)
                                    {
                                        messageOrigin = client.PlayerObject.transform.position;
                                        break;
                                    }
                                }
                            }

                            chatManager.BroadcastMessageFromServer(
                                resp.impostor_message.player_id,
                                resp.impostor_message.message,
                                messageOrigin,
                                Color.red
                            );
                        }

                        Debug.Log($"🤖 Impostor message received from {resp.impostor_message.player_id}: {resp.impostor_message.message}");
                    }
                }
                catch (Exception ex)
                {
                    Debug.LogError("Failed to parse chat response: " + ex + " raw: " + req.downloadHandler.text);
                }
            }
            else
            {
                Debug.LogError($"Chat POST failed to {url}: {req.error}");
            }
        }
    }
}