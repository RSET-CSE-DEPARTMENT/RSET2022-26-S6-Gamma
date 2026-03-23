using Unity.Netcode;
using UnityEngine;

public class SimplePlayerSpawn : MonoBehaviour
{
    [SerializeField] private Vector3 spawnPosition = new Vector3(549, 30, 89);

    void Start()
    {
        NetworkManager.Singleton.OnServerStarted += OnServerStarted;
    }

    void OnServerStarted()
    {
        NetworkManager.Singleton.OnClientConnectedCallback += OnClientConnected;
    }

    void OnClientConnected(ulong clientId)
    {
        // Wait one frame for player to spawn
        StartCoroutine(MovePlayerAfterSpawn(clientId));
    }

    System.Collections.IEnumerator MovePlayerAfterSpawn(ulong clientId)
    {
        yield return null; // Wait one frame

        if (NetworkManager.Singleton.ConnectedClients.TryGetValue(clientId, out var client))
        {
            if (client.PlayerObject != null)
            {
                client.PlayerObject.transform.position = spawnPosition;
                Debug.Log($"Player {clientId} spawned at {spawnPosition}");
            }
        }
    }
}