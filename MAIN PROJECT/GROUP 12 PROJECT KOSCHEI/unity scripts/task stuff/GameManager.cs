using System;
using System.Collections.Generic;
using Unity.Netcode;
using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    public event Action OnAllPlayersDead;
    public event Action OnGameOver;
    public event Action OnVictory;

    readonly HashSet<ulong> deadPlayers = new();
    bool gameEnded = false;

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
        Debug.Log("[GameManager] Initialized.");
    }

    public void RegisterPlayerDeath(ulong clientId)
    {
        if (!NetworkManager.Singleton.IsServer)
        {
            Debug.LogWarning("[GameManager] RegisterPlayerDeath called on client -- ignored.");
            return;
        }

        if (deadPlayers.Contains(clientId))
        {
            Debug.LogWarning($"[GameManager] Player {clientId} already registered as dead -- skipping.");
            return;
        }

        deadPlayers.Add(clientId);
        int total = NetworkManager.Singleton.ConnectedClients.Count;
        Debug.Log($"[GameManager] Player {clientId} died. Dead: {deadPlayers.Count}/{total}");

        if (deadPlayers.Count >= total && !gameEnded)
        {
            Debug.Log("[GameManager] All players are dead!");
            OnAllPlayersDead?.Invoke();
            TriggerGameOver();
        }
        else
        {
            Debug.Log($"[GameManager] {total - deadPlayers.Count} player(s) still alive.");
        }
    }

    public void TriggerGameOver()
    {
        if (gameEnded)
        {
            Debug.LogWarning("[GameManager] TriggerGameOver called but game already ended.");
            return;
        }
        gameEnded = true;
        Debug.Log("[GameManager] ===== GAME OVER =====");
        OnGameOver?.Invoke();
    }

    public void TriggerVictory()
    {
        if (gameEnded)
        {
            Debug.LogWarning("[GameManager] TriggerVictory called but game already ended.");
            return;
        }
        gameEnded = true;
        Debug.Log("[GameManager] ===== VICTORY =====");
        OnVictory?.Invoke();
    }

    public void ResetGameState()
    {
        gameEnded = false;
        deadPlayers.Clear();
        Debug.Log("[GameManager] Game state reset.");
    }
}
