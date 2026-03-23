using System;
using System.Collections;
using Unity.Netcode;
using UnityEngine;

public class Task1_FieldObjectives : MonoBehaviour, IGameTask
{
    [Header("Zone References")]
    public FirewoodDeliveryZone firewoodZone;
    public CanDeliveryZone canZone;

    [Header("Timer")]
    public float taskDuration = 300f;

    [Header("Penalty")]
    public PenaltyScavengerSpawner penaltySpawner;

    public event Action OnTaskCompleted;
    public event Action OnTaskFailed;

    bool mushroomsComplete = false;
    bool cansComplete = false;
    bool taskActive = false;
    Coroutine timerCoroutine;

    public void StartTask()
    {
        if (!NetworkManager.Singleton.IsServer)
        {
            Debug.LogWarning("[Task1] StartTask called on client -- ignored.");
            return;
        }
        if (taskActive)
        {
            Debug.LogWarning("[Task1] StartTask called but task is already running.");
            return;
        }

        if (firewoodZone == null) Debug.LogError("[Task1] FirewoodZone is not assigned!");
        if (canZone == null) Debug.LogError("[Task1] CanZone is not assigned!");
        if (penaltySpawner == null) Debug.LogWarning("[Task1] PenaltySpawner is not assigned -- no penalty on timer fail.");

        taskActive = true;
        mushroomsComplete = false;
        cansComplete = false;

        firewoodZone.OnMushroomsComplete += HandleMushroomsComplete;
        canZone.OnCansComplete += HandleCansComplete;

        timerCoroutine = StartCoroutine(TaskTimerRoutine());

        Debug.Log($"[Task1] Task started! Timer: {taskDuration}s");
        Debug.Log($"[Task1] Objectives: burn mushrooms at firewood zone AND deliver cans to church.");
    }

    public void EndTask()
    {
        if (!taskActive)
        {
            Debug.LogWarning("[Task1] EndTask called but task is not running.");
            return;
        }
        CleanUp();
        Debug.Log("[Task1] Task force-ended and cleaned up.");
    }

    IEnumerator TaskTimerRoutine()
    {
        Debug.Log($"[Task1] Timer started -- {taskDuration}s remaining.");
        float remaining = taskDuration;

        while (remaining > 0f && taskActive)
        {
            // Log every 60 seconds
            if (Mathf.FloorToInt(remaining) % 60 == 0)
                Debug.Log($"[Task1] Timer -- {remaining}s remaining.");
            yield return new WaitForSeconds(1f);
            remaining -= 1f;
        }

        if (!taskActive) yield break;

        Debug.Log("[Task1] TIMER EXPIRED -- penalty scavengers incoming!");
        Debug.Log("[Task1] Players must still complete objectives -- task is NOT failed yet.");
        penaltySpawner?.StartSpawning();
        OnTaskFailed?.Invoke();
    }

    void HandleMushroomsComplete()
    {
        if (!taskActive)
        {
            Debug.LogWarning("[Task1] HandleMushroomsComplete called but task is not active.");
            return;
        }
        Debug.Log("[Task1] Mushrooms objective COMPLETE.");
        mushroomsComplete = true;
        LogObjectiveStatus();
        CheckAllComplete();
    }

    void HandleCansComplete()
    {
        if (!taskActive)
        {
            Debug.LogWarning("[Task1] HandleCansComplete called but task is not active.");
            return;
        }
        Debug.Log("[Task1] Cans objective COMPLETE.");
        cansComplete = true;
        LogObjectiveStatus();
        CheckAllComplete();
    }

    void LogObjectiveStatus()
    {
        Debug.Log($"[Task1] Objective status -- Mushrooms: {(mushroomsComplete ? "DONE" : "pending")} | Cans: {(cansComplete ? "DONE" : "pending")}");
    }

    void CheckAllComplete()
    {
        if (!mushroomsComplete || !cansComplete)
        {
            Debug.Log("[Task1] Not all objectives done yet -- waiting.");
            return;
        }
        Debug.Log("[Task1] ALL objectives complete! Task 1 DONE.");
        CleanUp();
        OnTaskCompleted?.Invoke();
    }

    void CleanUp()
    {
        taskActive = false;
        if (timerCoroutine != null) { StopCoroutine(timerCoroutine); timerCoroutine = null; }
        if (firewoodZone != null) firewoodZone.OnMushroomsComplete -= HandleMushroomsComplete;
        if (canZone != null) canZone.OnCansComplete -= HandleCansComplete;
        penaltySpawner?.StopSpawning();
        Debug.Log("[Task1] Cleaned up -- events unsubscribed, penalty spawner stopped.");
    }
}
