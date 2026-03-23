using System.Collections;
using System.Collections.Generic;
using Unity.Netcode;
using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// Server-only penalty alien spawner.
/// Aliens are spawned via NetworkObject.Spawn() so they replicate to all clients.
///
/// Requirements:
///   • This script must be on a NetworkObject in the scene (or on the NetworkManager GO).
///   • The alien prefab MUST have a NetworkObject component and be registered in
///     NetworkManager -> NetworkPrefabs list.
/// </summary>
public class PenaltyScavengerSpawner : NetworkBehaviour
{
    [Header("Alien")]
    public GameObject alienPrefab;

    [Header("Waves")]
    public int aliensPerWave = 3;
    public float timeBetweenWaves = 15f;
    public float spawnStaggerInterval = 0.4f;
    public int maxLiveAliens = 30;

    [Header("Spawn Area")]
    public float spawnRadiusAroundPlayer = 15f;
    public float spawnRadiusJitter = 3f;
    public string playerTag = "Player";

    // Track spawned NetworkObjects so we can despawn them on StopSpawning
    readonly List<NetworkObject> spawnedAliens = new();
    bool isSpawning = false;
    Coroutine spawnCoroutine;

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    public void StartSpawning()
    {
        // Spawning must only run on the server — clients never call Spawn()
        if (!IsServer)
        {
            Debug.LogWarning("[PenaltySpawner] StartSpawning ignored — not the server.");
            return;
        }

        if (alienPrefab == null)
        {
            Debug.LogError("[PenaltySpawner] Alien Prefab is not assigned!");
            return;
        }

        // Confirm the prefab has a NetworkObject component
        if (alienPrefab.GetComponent<NetworkObject>() == null)
        {
            Debug.LogError("[PenaltySpawner] Alien prefab has no NetworkObject component! " +
                           "Add one and register it in NetworkManager's NetworkPrefabs list.");
            return;
        }

        if (isSpawning)
        {
            Debug.LogWarning("[PenaltySpawner] Already spawning.");
            return;
        }

        isSpawning = true;
        spawnCoroutine = StartCoroutine(SpawnWavesRoutine());
        Debug.Log("[PenaltySpawner] Penalty spawning STARTED.");
    }

    public void StopSpawning()
    {
        if (!IsServer) return;

        if (!isSpawning)
        {
            Debug.LogWarning("[PenaltySpawner] StopSpawning called but not currently spawning.");
            return;
        }

        isSpawning = false;
        if (spawnCoroutine != null) { StopCoroutine(spawnCoroutine); spawnCoroutine = null; }
        ClearAliens();
        Debug.Log("[PenaltySpawner] Penalty spawning STOPPED and aliens cleared.");
    }

    // -----------------------------------------------------------------------
    // Wave loop (server only)
    // -----------------------------------------------------------------------

    IEnumerator SpawnWavesRoutine()
    {
        int wave = 0;
        while (isSpawning)
        {
            wave++;

            // Purge entries for aliens that were killed/despawned
            spawnedAliens.RemoveAll(a => a == null || !a.IsSpawned);

            int toSpawn = Mathf.Min(aliensPerWave, maxLiveAliens - spawnedAliens.Count);

            if (toSpawn > 0)
            {
                Debug.Log($"[PenaltySpawner] Wave {wave} — spawning {toSpawn} aliens. " +
                          $"Live: {spawnedAliens.Count}/{maxLiveAliens}");

                for (int i = 0; i < toSpawn; i++)
                {
                    if (!isSpawning) yield break;
                    SpawnAlienNearPlayer();
                    yield return new WaitForSeconds(spawnStaggerInterval);
                }
            }
            else
            {
                Debug.Log($"[PenaltySpawner] Wave {wave} skipped — cap reached " +
                          $"({spawnedAliens.Count}/{maxLiveAliens}).");
            }

            Debug.Log($"[PenaltySpawner] Next wave in {timeBetweenWaves}s.");
            yield return new WaitForSeconds(timeBetweenWaves);
        }
    }

    // -----------------------------------------------------------------------
    // Spawn one alien — SERVER ONLY
    // -----------------------------------------------------------------------

    void SpawnAlienNearPlayer()
    {
        GameObject[] players = GameObject.FindGameObjectsWithTag(playerTag);
        if (players.Length == 0)
        {
            Debug.LogWarning("[PenaltySpawner] No players found with tag: " + playerTag);
            return;
        }

        GameObject target = players[Random.Range(0, players.Length)];
        Vector3 spawnPos = GetNavMeshPointNear(target.transform.position);

        // Instantiate locally on the server, then Spawn() — this replicates the
        // object to all connected clients automatically.
        GameObject alienGO = Instantiate(alienPrefab, spawnPos, Quaternion.identity);
        NetworkObject netObj = alienGO.GetComponent<NetworkObject>();

        // Spawn with destroyWithScene=true so aliens are cleaned up on scene unload
        netObj.Spawn(destroyWithScene: true);

        // Configure AlienMovement AFTER spawning (component exists on all clients
        // but only the server drives AI logic)
        AlienMovement movement = alienGO.GetComponent<AlienMovement>();
        if (movement != null)
        {
            movement.scientistTarget = null;
            Debug.Log($"[PenaltySpawner] Alien spawned near '{target.name}' at {spawnPos}.");
        }
        else
        {
            Debug.LogWarning("[PenaltySpawner] Spawned alien has no AlienMovement component.");
        }

        // Track with a death notifier so we remove it from the list when killed
        AlienDeathNotifier notifier = alienGO.GetComponent<AlienDeathNotifier>()
                                   ?? alienGO.AddComponent<AlienDeathNotifier>();

        NetworkObject capturedRef = netObj;
        notifier.OnDied += () =>
        {
            spawnedAliens.Remove(capturedRef);
            Debug.Log($"[PenaltySpawner] Alien killed. Remaining: {spawnedAliens.Count}");
        };

        spawnedAliens.Add(netObj);
    }

    // -----------------------------------------------------------------------
    // Despawn all tracked aliens (server only)
    // -----------------------------------------------------------------------

    void ClearAliens()
    {
        int count = spawnedAliens.Count;
        foreach (var netObj in spawnedAliens)
        {
            if (netObj != null && netObj.IsSpawned)
                netObj.Despawn(destroy: true);
        }
        spawnedAliens.Clear();
        Debug.Log($"[PenaltySpawner] Cleared {count} penalty aliens.");
    }

    // -----------------------------------------------------------------------
    // NavMesh helper
    // -----------------------------------------------------------------------

    Vector3 GetNavMeshPointNear(Vector3 center)
    {
        float angle = Random.Range(0f, 360f) * Mathf.Deg2Rad;
        float radius = spawnRadiusAroundPlayer + Random.Range(-spawnRadiusJitter, spawnRadiusJitter);
        Vector3 candidate = center + new Vector3(Mathf.Cos(angle) * radius, 0f, Mathf.Sin(angle) * radius);

        if (NavMesh.SamplePosition(candidate, out NavMeshHit hit, 6f, NavMesh.AllAreas))
            return hit.position;

        Debug.LogWarning($"[PenaltySpawner] NavMesh sample failed near {center} — using raw position.");
        return candidate;
    }
}