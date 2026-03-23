using Unity.Netcode;
using UnityEngine;

public class PickupObject : NetworkBehaviour
{
    // Called from ThirdPersonShooterController when player aims at this object and presses E
    public void TryPickup(GameObject playerObject)
    {
        if (playerObject == null)
        {
            Debug.LogError("playerObject is null in TryPickup!");
            return;
        }

        // IMPORTANT: The playerObject might be a child or the actual NetworkObject might be on parent
        NetworkObject playerNetObj = playerObject.GetComponentInParent<NetworkObject>();
        if (playerNetObj == null)
        {
            playerNetObj = playerObject.GetComponent<NetworkObject>();
        }

        if (playerNetObj == null)
        {
            Debug.LogError($"Player '{playerObject.name}' doesn't have NetworkObject component! Is this a spawned network player?");
            return;
        }

        if (!playerNetObj.IsSpawned)
        {
            Debug.LogError($"Player NetworkObject is not spawned yet!");
            return;
        }

        PlayerInventory inventory = playerObject.GetComponent<PlayerInventory>();
        if (inventory == null)
        {
            inventory = playerObject.GetComponentInParent<PlayerInventory>();
        }

        if (inventory != null && !inventory.IsHoldingItem())
        {
            Debug.Log($"Calling TryPickupServerRpc for player {playerNetObj.OwnerClientId}");
            TryPickupServerRpc(playerNetObj.OwnerClientId);
        }
        else if (inventory == null)
        {
            Debug.LogError("PlayerInventory not found on player or parent!");
        }
        else
        {
            Debug.Log("Player is already holding an item!");
        }
    }

    [ServerRpc(RequireOwnership = false)]
    void TryPickupServerRpc(ulong playerId)
    {
        Debug.Log($"[SERVER] TryPickupServerRpc called for player {playerId}");

        if (!NetworkManager.Singleton.ConnectedClients.TryGetValue(playerId, out var client))
        {
            Debug.LogError($"Could not find client with ID {playerId}");
            return;
        }

        if (client.PlayerObject == null)
        {
            Debug.LogError($"Client {playerId} has null PlayerObject!");
            return;
        }

        PlayerInventory inventory = client.PlayerObject.GetComponent<PlayerInventory>();
        if (inventory == null)
        {
            Debug.LogError($"PlayerInventory not found on client {playerId} player object!");
            return;
        }

        if (inventory.IsHoldingItem())
        {
            Debug.Log($"Player {playerId} is already holding an item!");
            return;
        }

        GameObject prefabReference = FindPrefabInNetworkList();
        if (prefabReference != null)
        {
            Debug.Log($"[SERVER] Picking up {prefabReference.name} for player {playerId}");
            inventory.PickupItem(prefabReference);

            // Despawn and destroy the object
            if (NetworkObject != null && NetworkObject.IsSpawned)
            {
                Debug.Log("[SERVER] Despawning network object");
                NetworkObject.Despawn();
            }
            Destroy(gameObject);
        }
        else
        {
            Debug.LogError($"Could not find prefab for {gameObject.name} in NetworkPrefabs list!");
        }
    }

    GameObject FindPrefabInNetworkList()
    {
        string cleanName = gameObject.name.Replace("(Clone)", "").Trim();
        Debug.Log($"Looking for prefab with name: {cleanName}");

        if (NetworkManager.Singleton == null)
        {
            Debug.LogError("NetworkManager.Singleton is null!");
            return null;
        }

        var prefabList = NetworkManager.Singleton.NetworkConfig.Prefabs.Prefabs;
        foreach (var networkPrefab in prefabList)
        {
            if (networkPrefab.Prefab.name == cleanName)
            {
                Debug.Log($"Found matching prefab: {networkPrefab.Prefab.name}");
                return networkPrefab.Prefab;
            }
        }

        Debug.LogError($"No matching prefab found for: {cleanName}. Make sure it's in NetworkManager's Network Prefabs list!");
        return null;
    }
}
