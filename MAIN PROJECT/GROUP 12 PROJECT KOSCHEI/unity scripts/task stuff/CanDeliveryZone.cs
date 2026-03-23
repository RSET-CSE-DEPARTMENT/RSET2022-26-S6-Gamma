using System;
using System.Collections.Generic;
using Unity.Netcode;
using UnityEngine;

public class CanDeliveryZone : NetworkBehaviour
{
    [SerializeField] private int requiredCans = 12;
    [SerializeField] private Transform dropOffPoint;
    [SerializeField]
    private List<string> foodCanPrefabNames = new List<string>
    {
        "soda can", "spam can", "meat can", "can 2", "can small", "can tall 2", "can tall",
        "meat can box old", "meat can round", "meat can box"
    };

    // ── Task1 listens to this (server-side only) ──
    public event Action OnCansComplete;

    private NetworkVariable<int> collectedCans = new NetworkVariable<int>(0);
    private bool playerInZone = false;
    private GameObject playerInTrigger = null;

    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();
        collectedCans.OnValueChanged += OnCansChanged;
    }

    void OnCansChanged(int oldValue, int newValue)
    {
        Debug.Log($"Cans delivered: {newValue}/{requiredCans}");
        if (newValue >= requiredCans)
        {
            Debug.Log("All cans delivered!");
            if (IsServer) OnCansComplete?.Invoke();
            CansCompleteClientRpc();
        }
    }

    void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            playerInZone = true;
            playerInTrigger = other.gameObject;
        }
    }

    void OnTriggerExit(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            playerInZone = false;
            playerInTrigger = null;
        }
    }

    void Update()
    {
        if (playerInZone && Input.GetKeyDown(KeyCode.E))
        {
            if (playerInTrigger != null)
            {
                PlayerInventory inventory = playerInTrigger.GetComponent<PlayerInventory>();
                if (inventory != null && inventory.IsHoldingItem())
                {
                    GameObject heldPrefab = inventory.GetHeldPrefab();
                    if (heldPrefab != null && IsFoodCan(heldPrefab))
                        DepositCanServerRpc(NetworkManager.Singleton.LocalClientId);
                    else
                        Debug.Log("Deposit option: NO. Item is not a valid food can.");
                }
                else
                {
                    Debug.Log("Deposit option: NO. Not holding anything.");
                }
            }
        }
    }

    bool IsFoodCan(GameObject itemPrefab)
    {
        string cleanName = itemPrefab.name.Replace("(Clone)", "").Trim();
        return foodCanPrefabNames.Contains(cleanName);
    }

    [ServerRpc(RequireOwnership = false)]
    void DepositCanServerRpc(ulong playerId)
    {
        if (NetworkManager.Singleton.ConnectedClients.TryGetValue(playerId, out var client))
        {
            PlayerInventory inventory = client.PlayerObject.GetComponent<PlayerInventory>();
            if (inventory != null && inventory.IsHoldingItem())
            {
                GameObject canType = inventory.GetHeldPrefab();
                inventory.DepositItem();
                SpawnCanInZone(canType);
                collectedCans.Value++;
            }
        }
    }

    void SpawnCanInZone(GameObject canPrefabToSpawn)
    {
        if (canPrefabToSpawn == null) return;
        int canCount = collectedCans.Value;
        Vector3 spawnPos;

        if (dropOffPoint != null)
        {
            float offsetX = (canCount % 4) * 0.4f;
            float offsetZ = (canCount / 4) * 0.4f;
            spawnPos = dropOffPoint.position + new Vector3(offsetX, 0.5f, offsetZ);
        }
        else
        {
            BoxCollider box = GetComponent<BoxCollider>();
            Vector3 center = box != null ? transform.TransformPoint(box.center) : transform.position;
            spawnPos = center + new Vector3((canCount % 4) * 0.4f - 0.6f, 0.5f, (canCount / 4) * 0.4f - 0.6f);
        }

        GameObject depositedCan = Instantiate(canPrefabToSpawn, spawnPos, Quaternion.identity);
        var pickup = depositedCan.GetComponent<PickupObject>();
        if (pickup != null) Destroy(pickup);

        foreach (Collider col in depositedCan.GetComponents<Collider>())
            if (col.isTrigger) col.enabled = false;

        NetworkObject netObj = depositedCan.GetComponent<NetworkObject>();
        if (netObj != null) netObj.Spawn();
    }

    [ClientRpc]
    void CansCompleteClientRpc()
    {
        Debug.Log("All cans delivered to the church!");
    }
}
