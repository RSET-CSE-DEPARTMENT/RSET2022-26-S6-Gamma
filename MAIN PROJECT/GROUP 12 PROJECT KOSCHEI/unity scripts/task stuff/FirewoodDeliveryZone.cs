using System;
using System.Collections.Generic;
using Unity.Netcode;
using UnityEngine;

public class FirewoodDeliveryZone : NetworkBehaviour
{
    [Header("Setup")]
    [SerializeField] private string firewoodPrefabName = "FireWood";
    [SerializeField] private List<GameObject> firewoodPileObjects;
    [SerializeField] private GameObject firePrefab;
    [SerializeField] private int requiredWood = 5;
    [SerializeField] private int requiredMushrooms = 13;

    // ── Task1 listens to these (server-side only) ──
    public event Action OnFireLit;
    public event Action OnMushroomsComplete;

    private NetworkVariable<int> depositedWood = new NetworkVariable<int>(0);
    private NetworkVariable<int> burnedMushrooms = new NetworkVariable<int>(0);
    private NetworkVariable<bool> fireIsActive = new NetworkVariable<bool>(false);

    private bool playerInZone = false;
    private GameObject playerInTrigger = null;

    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();
        depositedWood.OnValueChanged += OnWoodChanged;
        burnedMushrooms.OnValueChanged += OnMushroomChanged;
    }

    void OnWoodChanged(int oldValue, int newValue)
    {
        for (int i = 0; i < firewoodPileObjects.Count; i++)
            if (firewoodPileObjects[i] != null)
                firewoodPileObjects[i].SetActive(i < newValue);
        Debug.Log($"Pile updated: {newValue}/{requiredWood} wood pieces active.");
    }

    void OnMushroomChanged(int oldValue, int newValue)
    {
        Debug.Log($"Mushrooms burned: {newValue}/{requiredMushrooms}");
        if (newValue >= requiredMushrooms)
        {
            Debug.Log("All mushrooms burned!");
            if (IsServer) OnMushroomsComplete?.Invoke();
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
        if (!playerInZone) return;
        PlayerInventory inv = playerInTrigger != null ? playerInTrigger.GetComponent<PlayerInventory>() : null;

        if (Input.GetKeyDown(KeyCode.E))
        {
            if (inv != null && inv.IsHoldingItem() && depositedWood.Value < requiredWood)
            {
                GameObject held = inv.GetHeldPrefab();
                string heldName = held != null ? held.name.Replace("(Clone)", "").Trim() : "";
                bool isFirewood = heldName == firewoodPrefabName;
                if (isFirewood) DepositWoodServerRpc(NetworkManager.Singleton.LocalClientId);
                else Debug.Log("Deposit option: NO. Not holding valid firewood.");
            }
            else if ((inv == null || !inv.IsHoldingItem()) && depositedWood.Value >= requiredWood && firePrefab != null && !firePrefab.activeSelf)
            {
                LightFireServerRpc();
            }
            else if (inv != null && inv.IsHoldingItem() && fireIsActive.Value && burnedMushrooms.Value < requiredMushrooms)
            {
                GameObject held = inv.GetHeldPrefab();
                string heldName = held != null ? held.name.Replace("(Clone)", "").Trim() : "";
                bool isMushroom = heldName.StartsWith("mushroom", StringComparison.OrdinalIgnoreCase);
                if (isMushroom) DepositMushroomServerRpc(NetworkManager.Singleton.LocalClientId);
                else Debug.Log("Mushroom deposit option: NO. Not holding a mushroom.");
            }
        }
    }

    [ServerRpc(RequireOwnership = false)]
    void DepositWoodServerRpc(ulong playerId)
    {
        if (depositedWood.Value >= requiredWood) return;
        if (NetworkManager.Singleton.ConnectedClients.TryGetValue(playerId, out var client))
        {
            var inv = client.PlayerObject.GetComponent<PlayerInventory>();
            if (inv != null && inv.IsHoldingItem())
            {
                GameObject held = inv.GetHeldPrefab();
                if (held != null && held.name.Replace("(Clone)", "").Trim() == firewoodPrefabName)
                {
                    inv.DepositItem();
                    depositedWood.Value++;
                    Debug.Log("Firewood deposited. Total: " + depositedWood.Value);
                }
            }
        }
    }

    [ServerRpc(RequireOwnership = false)]
    void DepositMushroomServerRpc(ulong playerId)
    {
        if (!fireIsActive.Value || burnedMushrooms.Value >= requiredMushrooms) return;
        if (NetworkManager.Singleton.ConnectedClients.TryGetValue(playerId, out var client))
        {
            var inv = client.PlayerObject.GetComponent<PlayerInventory>();
            if (inv != null && inv.IsHoldingItem())
            {
                GameObject held = inv.GetHeldPrefab();
                if (held != null && held.name.StartsWith("mushroom", StringComparison.OrdinalIgnoreCase))
                {
                    inv.DepositItem();
                    burnedMushrooms.Value++;
                    Debug.Log($"Mushroom burned! {burnedMushrooms.Value}/{requiredMushrooms}");
                }
            }
        }
    }

    [ServerRpc(RequireOwnership = false)]
    void LightFireServerRpc()
    {
        if (firePrefab != null && !firePrefab.activeSelf)
        {
            firePrefab.SetActive(true);
            fireIsActive.Value = true;
            Debug.Log("Fire activated!");
            OnFireLit?.Invoke();       // server-side event for Task1
            FireLitClientRpc();
        }
    }

    [ClientRpc]
    void FireLitClientRpc()
    {
        Debug.Log("Fire lit -- now burn the mushrooms!");
    }
}
