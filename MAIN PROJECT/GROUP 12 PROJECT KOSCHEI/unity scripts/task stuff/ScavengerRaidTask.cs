using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

public class ScavengerRaidTask : MonoBehaviour, IGameTask
{
    [Header("Scene References")]
    public Transform buildingCenter;
    public Transform scientistNPC;

    [Header("Alien Prefab & Spawning")]
    public GameObject alienPrefab;
    public int totalAliens = 50;
    public int aliensPerWave = 5;
    public float timeBetweenWaves = 12f;
    public float spawnStaggerInterval = 0.35f;

    [Header("Spawn Ring")]
    public float spawnRadius = 20f;
    public float spawnRadiusJitter = 3f;

    [Header("Alien Behaviour Overrides")]
    public float alienPatrolRadius = 8f;

    public event Action OnTaskCompleted;
    public event Action OnTaskFailed;

    bool taskActive = false;
    int aliensSpawnedSoFar = 0;
    readonly List<GameObject> livingAliens = new();
    ScientistHealth scientistHealth;
    Coroutine spawnCoroutine;

    // ================================================================
    // IGameTask -- Public API
    // ================================================================

    public void StartTask()
    {
        if (taskActive)
        {
            Debug.LogWarning("[ScavengerRaidTask] StartTask called but task is already running.");
            return;
        }

        if (!ValidateReferences()) return;

        taskActive = true;
        aliensSpawnedSoFar = 0;
        livingAliens.Clear();

        scientistHealth = scientistNPC.GetComponent<ScientistHealth>()
                       ?? scientistNPC.gameObject.AddComponent<ScientistHealth>();

        scientistHealth.ResetHealth();
        scientistHealth.OnDeath += HandleScientistDied;

        Debug.Log("[ScavengerRaidTask] Task STARTED");
        spawnCoroutine = StartCoroutine(SpawnWavesRoutine());
    }

    public void EndTask()
    {
        if (!taskActive) return;
        taskActive = false;

        if (spawnCoroutine != null) { StopCoroutine(spawnCoroutine); spawnCoroutine = null; }

        if (scientistHealth != null)
            scientistHealth.OnDeath -= HandleScientistDied;

        ClearAllAliens();
        Debug.Log("[ScavengerRaidTask] Task force-ended and cleaned up.");
    }

    // ================================================================
    // Wave Spawning
    // ================================================================

    IEnumerator SpawnWavesRoutine()
    {
        int wave = 0;

        while (aliensSpawnedSoFar < totalAliens && taskActive)
        {
            wave++;
            int count = Mathf.Min(aliensPerWave, totalAliens - aliensSpawnedSoFar);
            Debug.Log($"[ScavengerRaidTask] Wave {wave} -- spawning {count} aliens (total spawned so far: {aliensSpawnedSoFar})");

            for (int i = 0; i < count; i++)
            {
                if (!taskActive) yield break;
                SpawnAlien();
                yield return new WaitForSeconds(spawnStaggerInterval);
            }

            if (aliensSpawnedSoFar < totalAliens && taskActive)
            {
                Debug.Log($"[ScavengerRaidTask] Next wave in {timeBetweenWaves}s...");
                yield return new WaitForSeconds(timeBetweenWaves);
            }
        }

        Debug.Log("[ScavengerRaidTask] All waves dispatched -- waiting for players to clear the raid...");
    }

    void SpawnAlien()
    {
        Vector3 pos = GetNavMeshSpawnPoint();
        GameObject alien = Instantiate(alienPrefab, pos, Quaternion.identity);

        AlienMovement movement = alien.GetComponent<AlienMovement>();
        if (movement != null)
        {
            movement.scientistTarget = scientistNPC;
            movement.patrolRadius = alienPatrolRadius;
        }
        else
        {
            Debug.LogWarning("[ScavengerRaidTask] Spawned alien prefab has no AlienMovement component!");
        }

        AlienDeathNotifier notifier = alien.AddComponent<AlienDeathNotifier>();
        notifier.OnDied += () => HandleAlienDied(alien);

        livingAliens.Add(alien);
        aliensSpawnedSoFar++;
    }

    Vector3 GetNavMeshSpawnPoint()
    {
        float angle = UnityEngine.Random.Range(0f, 360f) * Mathf.Deg2Rad;
        float radius = spawnRadius + UnityEngine.Random.Range(-spawnRadiusJitter, spawnRadiusJitter);

        Vector3 candidate = buildingCenter.position
                          + new Vector3(Mathf.Cos(angle) * radius, 0f, Mathf.Sin(angle) * radius);

        return NavMesh.SamplePosition(candidate, out NavMeshHit hit, 6f, NavMesh.AllAreas)
               ? hit.position
               : candidate;
    }

    // ================================================================
    // Win / Fail Conditions
    // ================================================================

    void HandleAlienDied(GameObject alien)
    {
        livingAliens.Remove(alien);
        if (!taskActive) return;

        int remaining = livingAliens.Count;
        int yetToSpawn = totalAliens - aliensSpawnedSoFar;
        Debug.Log($"[ScavengerRaidTask] Alien killed -- alive: {remaining}  yet to spawn: {yetToSpawn}");

        if (yetToSpawn <= 0 && remaining == 0)
        {
            taskActive = false;
            if (scientistHealth != null)
                scientistHealth.OnDeath -= HandleScientistDied;

            Debug.Log("[ScavengerRaidTask] TASK COMPLETE -- all aliens defeated! Scientist is safe.");
            OnTaskCompleted?.Invoke();
        }
    }

    void HandleScientistDied()
    {
        if (!taskActive) return;
        taskActive = false;

        if (spawnCoroutine != null) { StopCoroutine(spawnCoroutine); spawnCoroutine = null; }

        Debug.Log("[ScavengerRaidTask] TASK FAILED -- the scientist was killed!");
        OnTaskFailed?.Invoke();

        foreach (var alien in livingAliens)
        {
            if (alien == null) continue;
            var m = alien.GetComponent<AlienMovement>();
            if (m != null) m.scientistTarget = null;
        }
    }

    // ================================================================
    // Helpers
    // ================================================================

    void ClearAllAliens()
    {
        foreach (var alien in livingAliens)
        {
            if (alien == null) continue;
            var m = alien.GetComponent<AlienMovement>();
            if (m != null) m.scientistTarget = null;
            Destroy(alien);
        }
        livingAliens.Clear();
    }

    bool ValidateReferences()
    {
        if (buildingCenter == null) { Debug.LogError("[ScavengerRaidTask] buildingCenter is not assigned!"); return false; }
        if (scientistNPC == null) { Debug.LogError("[ScavengerRaidTask] scientistNPC is not assigned!"); return false; }
        if (alienPrefab == null) { Debug.LogError("[ScavengerRaidTask] alienPrefab is not assigned!"); return false; }
        if (alienPrefab.GetComponent<AlienMovement>() == null)
            Debug.LogWarning("[ScavengerRaidTask] alienPrefab has no AlienMovement -- scientist targeting won't work.");
        return true;
    }

    void OnDestroy()
    {
        if (taskActive) EndTask();
    }
}
