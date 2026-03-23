using System;
using System.Collections;
using UnityEngine;
using Unity.Netcode;

public class ScientistNPCDialogue : NetworkBehaviour
{
    [System.Serializable]
    public class DialogueStage
    {
        public string stageName = "Stage";
        [TextArea(2, 5)]
        public string[] lines = new string[] { "Hello." };
        [Tooltip("Seconds each line stays on screen before auto-advancing.")]
        public float secondsPerLine = 4f;
    }

    [Header("Dialogue Stages")]
    [SerializeField]
    private DialogueStage[] stages = new DialogueStage[]
    {
        new DialogueStage
        {
            stageName = "Introduction",
            secondsPerLine = 5f,
            lines = new string[]
            {
                "So. They actually sent someone. I was not holding my breath.",
                "I am what remains of the advance team. We entered three days ago. There were four of us. Now there is me.",
                "This place -- Koschei Station. Soviet research post. Abandoned. Flooded. Whatever happened here, it is not finished happening. You understand?",
                "Your objective is not complicated. Find the researchers still alive in this zone. Stay with your group. Do not wander. This place does not forgive stupidity.",
                "There is a woman waiting for you ahead. She has been in this zone longer than any of us. She knows the layout, the dangers, all of it. She will brief you properly.",
                "Go. And try not to die before you even reach her."
            }
        }
    };

    [Header("Animation")]
    [SerializeField] private Animator animator;
    [Tooltip("Must match the Bool parameter name in the Animator exactly.")]
    [SerializeField] private string talkingBool = "Talking";
    [SerializeField] private string speedFloat = "Speed";

    // -------------------------------------------------------------------------
    // NetworkVariables
    // -------------------------------------------------------------------------
    private NetworkVariable<bool> _isTalking = new NetworkVariable<bool>(false,
        NetworkVariableReadPermission.Everyone, NetworkVariableWritePermission.Server);

    private NetworkVariable<int> _currentStage = new NetworkVariable<int>(0,
        NetworkVariableReadPermission.Everyone, NetworkVariableWritePermission.Server);

    private NetworkVariable<int> _currentLine = new NetworkVariable<int>(0,
        NetworkVariableReadPermission.Everyone, NetworkVariableWritePermission.Server);

    private NetworkVariable<float> _syncSpeed = new NetworkVariable<float>(0f,
        NetworkVariableReadPermission.Everyone, NetworkVariableWritePermission.Server);

    // Synced death state -- so late-joining clients also see NPC as dead
    private NetworkVariable<bool> _isDead = new NetworkVariable<bool>(false,
        NetworkVariableReadPermission.Everyone, NetworkVariableWritePermission.Server);

    private Coroutine _dialogueCoroutine;
    private ulong _interactingClientId = ulong.MaxValue;

    /// <summary>
    /// Fires on the server when a dialogue stage fully completes.
    /// int = the stage index that just finished.
    /// </summary>
    public event Action<int> OnStageCompleted;

    // -------------------------------------------------------------------------
    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();

        if (animator == null)
            animator = GetComponentInChildren<Animator>();

        // Talking animation
        _isTalking.OnValueChanged += (_, nowTalking) =>
        {
            if (animator != null)
                animator.SetBool(talkingBool, nowTalking);
        };

        // Walk speed
        _syncSpeed.OnValueChanged += (_, speed) =>
        {
            if (animator != null)
                animator.SetFloat(speedFloat, speed);
        };

        // Death sync -- fires on all clients when server sets _isDead
        _isDead.OnValueChanged += (_, nowDead) =>
        {
            if (nowDead)
            {
                var controller = GetComponent<ScientistNPCController>();
                if (controller != null) controller.KillNPC();
            }
        };

        // Apply current state immediately for late-joining clients
        if (animator != null)
        {
            animator.SetBool(talkingBool, _isTalking.Value);
            animator.SetFloat(speedFloat, _syncSpeed.Value);
        }

        if (_isDead.Value)
        {
            var controller = GetComponent<ScientistNPCController>();
            if (controller != null) controller.KillNPC();
        }
    }

    // -------------------------------------------------------------------------
    // Speed sync (called by controller on server every frame)
    // -------------------------------------------------------------------------
    public void ServerUpdateSpeed(float speed)
    {
        if (!IsServer) return;
        _syncSpeed.Value = speed;
    }

    // -------------------------------------------------------------------------
    // Interact
    // -------------------------------------------------------------------------
    public void RequestInteractFromController(ulong clientId)
    {
        if (IsServer)
            RequestInteract(clientId);
        else
            RequestInteractServerRpc(clientId);
    }

    [ServerRpc(RequireOwnership = false)]
    private void RequestInteractServerRpc(ulong clientId) { RequestInteract(clientId); }

    public void RequestInteract(ulong clientId)
    {
        if (!IsServer) return;
        if (_isTalking.Value) return;
        if (_isDead.Value) return;

        if (_dialogueCoroutine != null)
            StopCoroutine(_dialogueCoroutine);

        _interactingClientId = clientId;
        _dialogueCoroutine = StartCoroutine(RunDialogue());
    }

    // -------------------------------------------------------------------------
    // Stage unlocking -- called from TaskManager when a new phase begins
    // -------------------------------------------------------------------------
    public void UnlockNextStage()
    {
        if (IsServer) UnlockNextStageInternal();
        else UnlockNextStageServerRpc();
    }

    [ServerRpc(RequireOwnership = false)]
    private void UnlockNextStageServerRpc() { UnlockNextStageInternal(); }

    private void UnlockNextStageInternal()
    {
        int next = _currentStage.Value + 1;
        if (next < stages.Length)
        {
            _currentStage.Value = next;
            Debug.Log("[NPC] Stage unlocked: " + stages[next].stageName);
        }
    }

    // -------------------------------------------------------------------------
    // Kill NPC -- synced to all clients via NetworkVariable
    // Always call this instead of calling KillNPC() on the controller directly
    // -------------------------------------------------------------------------
    public void SyncKillNPC()
    {
        if (!IsServer)
        {
            Debug.LogWarning("[ScientistNPCDialogue] SyncKillNPC called on client -- ignored.");
            return;
        }
        if (_isDead.Value) return;

        _isDead.Value = true; // triggers OnValueChanged on all clients

        // Also kill locally on server immediately
        var controller = GetComponent<ScientistNPCController>();
        if (controller != null) controller.KillNPC();

        Debug.Log($"[ScientistNPCDialogue] {gameObject.name} death synced to all clients.");
    }

    // -------------------------------------------------------------------------
    // Proximity UI
    // -------------------------------------------------------------------------
    public void SetPlayerNearby(bool nearby)
    {
        if (NPCDialogueUI.Instance == null) return;
        if (_isDead.Value) return; // dead NPC shows no UI

        NPCDialogueUI.Instance.IsNearNPC = nearby;

        if (nearby)
        {
            if (!_isTalking.Value)
                NPCDialogueUI.Instance.ShowInteractHint();
            else
            {
                int s = _currentStage.Value;
                int l = _currentLine.Value;
                if (s < stages.Length && l < stages[s].lines.Length)
                    NPCDialogueUI.Instance.ShowLine(stages[s].lines[l]);
            }
        }
        else
        {
            NPCDialogueUI.Instance.HideDialogue();
        }
    }

    // -------------------------------------------------------------------------
    // Server coroutine -- single source of truth for dialogue timing
    // -------------------------------------------------------------------------
    private IEnumerator RunDialogue()
    {
        if (stages == null || stages.Length == 0) yield break;

        int stageIdx = Mathf.Clamp(_currentStage.Value, 0, stages.Length - 1);
        DialogueStage stage = stages[stageIdx];
        if (stage.lines == null || stage.lines.Length == 0) yield break;

        _isTalking.Value = true;

        var controller = GetComponent<ScientistNPCController>();
        if (controller != null)
        {
            Transform playerTransform = null;
            if (NetworkManager.Singleton.ConnectedClients.TryGetValue(_interactingClientId, out var client))
                playerTransform = client.PlayerObject != null ? client.PlayerObject.transform : null;
            controller.StartTalking(playerTransform);
        }

        for (int i = 0; i < stage.lines.Length; i++)
        {
            _currentLine.Value = i;
            ShowLineClientRpc(stage.lines[i]);
            yield return new WaitForSeconds(stage.secondsPerLine);
        }

        _isTalking.Value = false;
        _currentLine.Value = 0;
        HideDialogueClientRpc();

        if (controller != null) controller.StopTalking();

        _dialogueCoroutine = null;

        // Notify TaskManager -- server only
        OnStageCompleted?.Invoke(stageIdx);
    }

    // -------------------------------------------------------------------------
    [ClientRpc]
    private void ShowLineClientRpc(string line)
    {
        if (NPCDialogueUI.Instance != null && NPCDialogueUI.Instance.IsNearNPC)
            NPCDialogueUI.Instance.ShowLine(line);
    }

    [ClientRpc]
    private void HideDialogueClientRpc()
    {
        if (NPCDialogueUI.Instance != null)
            NPCDialogueUI.Instance.HideDialogue();
    }

    public bool IsTalking => _isTalking.Value;
    public bool IsDead => _isDead.Value;
}
