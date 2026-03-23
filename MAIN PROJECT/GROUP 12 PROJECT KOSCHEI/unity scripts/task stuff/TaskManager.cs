using System;
using Unity.Netcode;
using UnityEngine;

public enum GamePhase
{
    Intro,
    Briefing,
    Task1_Field,
    ReturnBriefing,
    Task2_ScavengerRaid,
    PetrovDebrief,
    ReturnToVoss,
    BossFight,
    Victory,
    GameOver
}

public class TaskManager : NetworkBehaviour
{
    public static TaskManager Instance { get; private set; }

    [Header("Tasks")]
    [SerializeField] Task1_FieldObjectives fieldTask;
    [SerializeField] ScavengerRaidTask scavengerRaidTask;

    [Header("NPC1 -- Intro Scientist (dies at boss fight)")]
    [SerializeField] ScientistNPCDialogue npc1Dialogue;
    [SerializeField] ScientistNPCController npc1Controller;

    [Header("NPC2 -- Dr. Voss")]
    [SerializeField] ScientistNPCDialogue npc2Dialogue;

    [Header("NPC3 -- Dr. Petrov")]
    [SerializeField] ScientistNPCDialogue npc3Dialogue;
    [SerializeField] ScientistNPCController npc3Controller;

    [Header("Boss Fight")]
    [SerializeField] GameObject bossPrefab;
    [SerializeField] Transform bossSpawnPoint;

    [Header("Impostor")]
    [SerializeField] ImpostorBackendConnector impostorConnector;

    [Header("Debug -- Read Only")]
    [SerializeField] private GamePhase currentPhaseDisplay;

    // Synced to all clients
    private NetworkVariable<int> _networkPhase = new NetworkVariable<int>(
        0,
        NetworkVariableReadPermission.Everyone,
        NetworkVariableWritePermission.Server
    );

    public event Action<GamePhase> OnPhaseChanged;
    public GamePhase CurrentPhase => (GamePhase)_networkPhase.Value;

    // ================================================================
    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
    }

    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();

        // Fires on ALL clients whenever phase changes
        _networkPhase.OnValueChanged += (oldVal, newVal) =>
        {
            GamePhase oldPhase = (GamePhase)oldVal;
            GamePhase newPhase = (GamePhase)newVal;
            currentPhaseDisplay = newPhase;
            Debug.Log($"[TaskManager] ========== PHASE CHANGED: {oldPhase} -> {newPhase} ==========");
            Debug.Log($"[TaskManager] {GetPhaseDescription(newPhase)}");
        };

        // Apply immediately for late-joining clients
        currentPhaseDisplay = (GamePhase)_networkPhase.Value;

        if (!IsServer) return;

        ValidateReferences();

        if (GameManager.Instance != null)
            GameManager.Instance.OnAllPlayersDead += HandleGameOver;

        if (npc1Dialogue != null) npc1Dialogue.OnStageCompleted += OnNpc1StageCompleted;
        if (npc2Dialogue != null) npc2Dialogue.OnStageCompleted += OnNpc2StageCompleted;
        if (npc3Dialogue != null) npc3Dialogue.OnStageCompleted += OnNpc3StageCompleted;

        BeginIntro();
    }

    // ================================================================
    // NPC Dialogue Callbacks
    // ================================================================

    void OnNpc1StageCompleted(int stageIdx)
    {
        Debug.Log($"[TaskManager] NPC1 stage {stageIdx} complete (phase: {CurrentPhase})");

        if (stageIdx == 0 && CurrentPhase == GamePhase.Intro)
            CompleteIntro();
    }

    void OnNpc2StageCompleted(int stageIdx)
    {
        Debug.Log($"[TaskManager] NPC2 (Dr. Voss) stage {stageIdx} complete (phase: {CurrentPhase})");

        if (stageIdx == 0 && CurrentPhase == GamePhase.Briefing) CompleteBriefing();
        else if (stageIdx == 1 && CurrentPhase == GamePhase.ReturnBriefing) CompleteReturnBriefing();
        else if (stageIdx == 2 && CurrentPhase == GamePhase.ReturnToVoss) CompleteReturnToVoss();
    }

    void OnNpc3StageCompleted(int stageIdx)
    {
        Debug.Log($"[TaskManager] NPC3 (Dr. Petrov) stage {stageIdx} complete (phase: {CurrentPhase})");

        if (stageIdx == 0)
            Debug.Log("[TaskManager] NPC3 combat lines done -- scavengers still active.");
        else if (stageIdx == 1 && CurrentPhase == GamePhase.PetrovDebrief)
            BeginReturnToVoss();
    }

    // ================================================================
    // Phase 1 -- Intro
    // ================================================================

    void BeginIntro()
    {
        SetPhase(GamePhase.Intro);
    }

    public void CompleteIntro()
    {
        if (!IsServer) return;
        if (CurrentPhase != GamePhase.Intro)
        {
            Debug.LogWarning($"[TaskManager] CompleteIntro ignored -- phase is {CurrentPhase}");
            return;
        }
        BeginBriefing();
    }

    // ================================================================
    // Phase 2 -- Briefing (NPC2 stage 0)
    // ================================================================

    void BeginBriefing()
    {
        SetPhase(GamePhase.Briefing);
    }

    public void CompleteBriefing()
    {
        if (!IsServer) return;
        if (CurrentPhase != GamePhase.Briefing)
        {
            Debug.LogWarning($"[TaskManager] CompleteBriefing ignored -- phase is {CurrentPhase}");
            return;
        }
        impostorConnector?.EnableImpostorSpawning();
        BeginTask1();
    }

    // ================================================================
    // Phase 3 -- Task 1
    // ================================================================

    void BeginTask1()
    {
        SetPhase(GamePhase.Task1_Field);

        fieldTask.OnTaskCompleted += OnTask1Completed;
        fieldTask.OnTaskFailed += OnTask1TimerFailed;
        fieldTask.StartTask();
    }

    void OnTask1Completed()
    {
        Debug.Log("[TaskManager] Task 1 COMPLETE.");
        fieldTask.OnTaskCompleted -= OnTask1Completed;
        fieldTask.OnTaskFailed -= OnTask1TimerFailed;
        BeginReturnBriefing();
    }

    void OnTask1TimerFailed()
    {
        Debug.Log("[TaskManager] Task 1 timer expired -- penalty scavengers spawning. Task still active.");
    }

    // ================================================================
    // Phase 4 -- Return Briefing (NPC2 stage 1)
    // ================================================================

    void BeginReturnBriefing()
    {
        SetPhase(GamePhase.ReturnBriefing);
        npc2Dialogue?.UnlockNextStage();
    }

    public void CompleteReturnBriefing()
    {
        if (!IsServer) return;
        if (CurrentPhase != GamePhase.ReturnBriefing)
        {
            Debug.LogWarning($"[TaskManager] CompleteReturnBriefing ignored -- phase is {CurrentPhase}");
            return;
        }
        BeginTask2();
    }

    // ================================================================
    // Phase 5 -- Task 2 (Scavenger Raid)
    // ================================================================

    void BeginTask2()
    {
        SetPhase(GamePhase.Task2_ScavengerRaid);

        scavengerRaidTask.OnTaskCompleted += OnTask2Completed;
        scavengerRaidTask.OnTaskFailed += OnTask2Failed;
        scavengerRaidTask.StartTask();
    }

    void OnTask2Completed()
    {
        Debug.Log("[TaskManager] Task 2 COMPLETE -- Petrov is safe.");
        scavengerRaidTask.OnTaskCompleted -= OnTask2Completed;
        scavengerRaidTask.OnTaskFailed -= OnTask2Failed;

        npc3Dialogue?.UnlockNextStage();

        BeginPetrovDebrief();
    }

    void OnTask2Failed()
    {
        Debug.Log("[TaskManager] Task 2 FAILED -- Petrov was killed.");
        scavengerRaidTask.OnTaskCompleted -= OnTask2Completed;
        scavengerRaidTask.OnTaskFailed -= OnTask2Failed;
        HandleGameOver();
    }

    // ================================================================
    // Phase 6 -- Petrov Debrief (NPC3 stage 1)
    // ================================================================

    void BeginPetrovDebrief()
    {
        SetPhase(GamePhase.PetrovDebrief);
    }

    // ================================================================
    // Phase 7 -- Return to Voss (NPC2 stage 2)
    // ================================================================

    void BeginReturnToVoss()
    {
        SetPhase(GamePhase.ReturnToVoss);
        npc2Dialogue?.UnlockNextStage();
    }

    public void CompleteReturnToVoss()
    {
        if (!IsServer) return;
        if (CurrentPhase != GamePhase.ReturnToVoss)
        {
            Debug.LogWarning($"[TaskManager] CompleteReturnToVoss ignored -- phase is {CurrentPhase}");
            return;
        }
        BeginBossFight();
    }

    // ================================================================
    // Phase 8 -- Boss Fight
    // ================================================================

    void BeginBossFight()
    {
        SetPhase(GamePhase.BossFight);

        impostorConnector?.DisableImpostorSpawning();

        if (npc1Dialogue != null)
            npc1Dialogue.SyncKillNPC();
        else
            Debug.LogWarning("[TaskManager] npc1Dialogue not assigned -- NPC1 won't die.");

        if (bossPrefab != null && bossSpawnPoint != null)
        {
            GameObject boss = Instantiate(bossPrefab, bossSpawnPoint.position, bossSpawnPoint.rotation);
            NetworkObject netObj = boss.GetComponent<NetworkObject>();
            if (netObj != null) netObj.Spawn(true);
            Debug.Log($"[TaskManager] Boss spawned at {bossSpawnPoint.position}.");
        }
        else
        {
            Debug.LogWarning("[TaskManager] bossPrefab or bossSpawnPoint not assigned -- boss not spawned.");
        }
    }

    public void OnBossDefeated()
    {
        if (!IsServer) return;
        if (CurrentPhase != GamePhase.BossFight)
        {
            Debug.LogWarning($"[TaskManager] OnBossDefeated ignored -- phase is {CurrentPhase}");
            return;
        }
        SetPhase(GamePhase.Victory);
        GameManager.Instance?.TriggerVictory();
    }

    // ================================================================
    // Game Over
    // ================================================================

    void HandleGameOver()
    {
        if (CurrentPhase == GamePhase.GameOver) return;

        if (CurrentPhase == GamePhase.Task1_Field)
        {
            fieldTask.OnTaskCompleted -= OnTask1Completed;
            fieldTask.OnTaskFailed -= OnTask1TimerFailed;
            fieldTask.EndTask();
        }
        if (CurrentPhase == GamePhase.Task2_ScavengerRaid)
        {
            scavengerRaidTask.OnTaskCompleted -= OnTask2Completed;
            scavengerRaidTask.OnTaskFailed -= OnTask2Failed;
            scavengerRaidTask.EndTask();
        }

        impostorConnector?.DisableImpostorSpawning();
        SetPhase(GamePhase.GameOver);
        GameManager.Instance?.TriggerGameOver();
    }

    // ================================================================
    // Helpers
    // ================================================================

    void SetPhase(GamePhase phase)
    {
        GamePhase previous = CurrentPhase;
        _networkPhase.Value = (int)phase;
        currentPhaseDisplay = phase;

        Debug.Log($"[TaskManager] ========== PHASE CHANGED: {previous} -> {phase} ==========");
        Debug.Log($"[TaskManager] {GetPhaseDescription(phase)}");

        OnPhaseChanged?.Invoke(phase);
    }

    string GetPhaseDescription(GamePhase phase)
    {
        return phase switch
        {
            GamePhase.Intro => "Players should approach NPC1 and press E.",
            GamePhase.Briefing => "Players should find Dr. Voss (NPC2) and press E.",
            GamePhase.Task1_Field => "Players must burn mushrooms AND deliver food cans.",
            GamePhase.ReturnBriefing => "NPC2 stage 1 unlocked. Players return to Dr. Voss.",
            GamePhase.Task2_ScavengerRaid => "Players must protect Dr. Petrov from scavenger waves.",
            GamePhase.PetrovDebrief => "NPC3 stage 1 unlocked. Players talk to Dr. Petrov for lore.",
            GamePhase.ReturnToVoss => "NPC2 stage 2 unlocked. Players return to Dr. Voss.",
            GamePhase.BossFight => "NPC1 is dead. Boss has spawned. Impostor disabled.",
            GamePhase.Victory => "Boss defeated. All objectives complete.",
            GamePhase.GameOver => "All players dead or objective failed.",
            _ => "Unknown phase."
        };
    }

    void ValidateReferences()
    {
        if (fieldTask == null) Debug.LogError("[TaskManager] fieldTask not assigned!");
        if (scavengerRaidTask == null) Debug.LogError("[TaskManager] scavengerRaidTask not assigned!");
        if (npc1Dialogue == null) Debug.LogError("[TaskManager] npc1Dialogue not assigned!");
        if (npc1Controller == null) Debug.LogWarning("[TaskManager] npc1Controller not assigned.");
        if (npc2Dialogue == null) Debug.LogError("[TaskManager] npc2Dialogue not assigned!");
        if (npc3Dialogue == null) Debug.LogError("[TaskManager] npc3Dialogue not assigned!");
        if (npc3Controller == null) Debug.LogWarning("[TaskManager] npc3Controller not assigned.");
        if (bossPrefab == null) Debug.LogWarning("[TaskManager] bossPrefab not assigned!");
        if (bossSpawnPoint == null) Debug.LogWarning("[TaskManager] bossSpawnPoint not assigned!");
        if (impostorConnector == null) Debug.LogWarning("[TaskManager] impostorConnector not assigned.");
    }

    public override void OnDestroy()
    {
        base.OnDestroy();
        if (npc1Dialogue != null) npc1Dialogue.OnStageCompleted -= OnNpc1StageCompleted;
        if (npc2Dialogue != null) npc2Dialogue.OnStageCompleted -= OnNpc2StageCompleted;
        if (npc3Dialogue != null) npc3Dialogue.OnStageCompleted -= OnNpc3StageCompleted;
        if (GameManager.Instance != null) GameManager.Instance.OnAllPlayersDead -= HandleGameOver;
    }
}
