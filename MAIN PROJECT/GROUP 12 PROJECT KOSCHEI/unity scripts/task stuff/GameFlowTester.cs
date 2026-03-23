using UnityEngine;
using Unity.Netcode;

/// <summary>
/// Server-only keyboard shortcuts to manually advance game phases for testing.
///
/// 1 = CompleteIntro            NPC1 intro done
/// 2 = CompleteBriefing         NPC2 field brief done -> Task1 + impostor start
/// 3 = CompleteReturnBriefing   NPC2 rescue brief done -> Scavenger Raid starts
/// 4 = Skip PetrovDebrief       Force BeginReturnToVoss (NPC3 lore done)
/// 5 = CompleteReturnToVoss     NPC2 Koschei reaction done -> Boss Fight
/// 6 = OnBossDefeated           Victory
/// 7 = Simulate player 0 death
/// </summary>
public class GameFlowTester : MonoBehaviour
{
    void Update()
    {
        if (NetworkManager.Singleton == null || !NetworkManager.Singleton.IsServer) return;

        if (Input.GetKeyDown(KeyCode.Alpha1))
        {
            Debug.Log("[TESTER] 1 -- CompleteIntro");
            TaskManager.Instance?.CompleteIntro();
        }
        if (Input.GetKeyDown(KeyCode.Alpha2))
        {
            Debug.Log("[TESTER] 2 -- CompleteBriefing");
            TaskManager.Instance?.CompleteBriefing();
        }
        if (Input.GetKeyDown(KeyCode.Alpha3))
        {
            Debug.Log("[TESTER] 3 -- CompleteReturnBriefing");
            TaskManager.Instance?.CompleteReturnBriefing();
        }
        if (Input.GetKeyDown(KeyCode.Alpha4))
        {
            Debug.Log("[TESTER] 4 -- Skip PetrovDebrief -> ReturnToVoss");
            if (TaskManager.Instance != null &&
                TaskManager.Instance.CurrentPhase == GamePhase.PetrovDebrief)
            {
                // Simulate NPC3 stage 1 completing
                TaskManager.Instance.CompleteReturnToVoss();
            }
            else
            {
                Debug.LogWarning("[TESTER] Not in PetrovDebrief phase -- ignored.");
            }
        }
        if (Input.GetKeyDown(KeyCode.Alpha5))
        {
            Debug.Log("[TESTER] 5 -- CompleteReturnToVoss -> Boss Fight");
            TaskManager.Instance?.CompleteReturnToVoss();
        }
        if (Input.GetKeyDown(KeyCode.Alpha6))
        {
            Debug.Log("[TESTER] 6 -- OnBossDefeated -> Victory");
            TaskManager.Instance?.OnBossDefeated();
        }
        if (Input.GetKeyDown(KeyCode.Alpha7))
        {
            Debug.Log("[TESTER] 7 -- Simulate player 0 death");
            GameManager.Instance?.RegisterPlayerDeath(0);
        }
    }
}
