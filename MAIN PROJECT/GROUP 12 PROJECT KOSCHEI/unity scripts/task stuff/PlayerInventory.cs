using Unity.Netcode;
using UnityEngine;

public class PlayerInventory : NetworkBehaviour
{
    private NetworkVariable<bool> holdingItem = new NetworkVariable<bool>(false);
    private NetworkVariable<int> heldPrefabIndex = new NetworkVariable<int>(-1);

    public bool IsHoldingItem()
    {
        return holdingItem.Value;
    }

    public GameObject GetHeldPrefab()
    {
        if (heldPrefabIndex.Value < 0) return null;
        var prefabList = NetworkManager.Singleton.NetworkConfig.Prefabs.Prefabs;
        if (heldPrefabIndex.Value < prefabList.Count)
        {
            return prefabList[heldPrefabIndex.Value].Prefab;
        }
        return null;
    }

    [ServerRpc(RequireOwnership = false)]
    public void DropItemServerRpc(Vector3 dropPosition)
    {
        Debug.Log($"[SERVER] DropItemServerRpc called. Holding: {holdingItem.Value}, Index: {heldPrefabIndex.Value}");

        if (!holdingItem.Value || heldPrefabIndex.Value < 0)
        {
            Debug.Log("[SERVER] Not holding any item to drop");
            return;
        }

        GameObject prefab = GetHeldPrefab();
        if (prefab == null)
        {
            Debug.LogError("[SERVER] GetHeldPrefab returned null!");
            return;
        }

        Debug.Log($"[SERVER] Dropping {prefab.name} at position {dropPosition}");

        GameObject dropped = Instantiate(prefab, dropPosition, Quaternion.identity);
        var netObj = dropped.GetComponent<NetworkObject>();
        if (netObj != null)
        {
            netObj.Spawn();
            Debug.Log($"[SERVER] Spawned dropped item: {dropped.name}");
        }
        else
        {
            Debug.LogError($"[SERVER] Dropped object {dropped.name} has no NetworkObject component!");
            Destroy(dropped);
            return;
        }

        holdingItem.Value = false;
        heldPrefabIndex.Value = -1;
        Debug.Log("[SERVER] Item dropped successfully, inventory cleared");
    }

    public void PickupItem(GameObject itemPrefab)
    {
        if (!IsServer)
        {
            Debug.LogError("PickupItem called on client! This should only run on server.");
            return;
        }

        int prefabIndex = FindPrefabIndex(itemPrefab);
        if (prefabIndex >= 0)
        {
            holdingItem.Value = true;
            heldPrefabIndex.Value = prefabIndex;
            Debug.Log($"[SERVER] Item picked up: {itemPrefab.name}, index: {prefabIndex}");
        }
        else
        {
            Debug.LogError($"Could not find {itemPrefab.name} in Network Prefabs List!");
        }
    }

    public void DepositItem()
    {
        if (!IsServer)
        {
            Debug.LogError("DepositItem called on client! This should only run on server.");
            return;
        }

        holdingItem.Value = false;
        heldPrefabIndex.Value = -1;
        Debug.Log("[SERVER] Item deposited, inventory cleared");
    }

    int FindPrefabIndex(GameObject prefab)
    {
        var prefabList = NetworkManager.Singleton.NetworkConfig.Prefabs.Prefabs;
        for (int i = 0; i < prefabList.Count; i++)
        {
            if (prefabList[i].Prefab == prefab || prefabList[i].Prefab.name == prefab.name)
            {
                Debug.Log($"Found prefab {prefab.name} at index {i}");
                return i;
            }
        }
        return -1;
    }
}
