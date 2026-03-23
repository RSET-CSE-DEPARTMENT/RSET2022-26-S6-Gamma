using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;
using Unity.Netcode;
using StarterAssets;

public enum ScientistState { Idle, Patrol, Talk, Dead }

public class ScientistNPCController : MonoBehaviour
{
    [Header("Movement Speeds")]
    public float patrolSpeed = 2f;

    [Header("Idle / Talk")]
    public float idleTimeAtPatrolPoint = 2f;
    public float interactionRange = 3f;
    public float facePlayerSpeed = 5f;

    [Header("Random Patrol")]
    public float patrolRadius = 20f;

    [Header("Animation")]
    public Animator animator;
    public string speedParam = "Speed";
    [Tooltip("Optional: Trigger parameter name in the Animator for death.")]
    public string dieParam = "Die";

    NavMeshAgent agent;
    ScientistState state = ScientistState.Idle;
    float stateTimer = 0f;
    Vector3 homePosition;
    bool isTalking = false;
    Transform talkingToPlayer;

    private ScientistNPCDialogue _dialogue;
    private bool _playerWasNearby = false;
    private bool isDead = false;

    public bool IsDead => isDead;

    void Start()
    {
        agent = GetComponent<NavMeshAgent>();
        _dialogue = GetComponent<ScientistNPCDialogue>();

        if (animator == null)
            animator = GetComponentInChildren<Animator>();

        homePosition = transform.position;
        state = ScientistState.Patrol;
        agent.speed = patrolSpeed;
        SetRandomPatrolDestination();
    }

    void Update()
    {
        if (isDead) return;

        CheckForPlayerProximity();

        if (!(_dialogue != null && _dialogue.IsTalking))
            CheckForInteractPress();

        switch (state)
        {
            case ScientistState.Patrol: UpdatePatrol(); break;
            case ScientistState.Idle: UpdateIdle(); break;
            case ScientistState.Talk: UpdateTalk(); break;
        }

        bool isServer = NetworkManager.Singleton != null && NetworkManager.Singleton.IsServer;
        if (isServer)
        {
            float speed = isTalking ? 0f : agent.velocity.magnitude;
            if (_dialogue != null) _dialogue.ServerUpdateSpeed(speed);
            UpdateAnimationFromAgent();
        }
    }

    // -------------------------------------------------------------------------
    // Proximity check -- runs on every client to keep UI hint accurate
    // -------------------------------------------------------------------------
    void CheckForPlayerProximity()
    {
        Collider[] nearby = Physics.OverlapSphere(transform.position, interactionRange);

        GameObject localPlayer = null;
        foreach (Collider col in nearby)
        {
            if (!col.CompareTag("Player")) continue;
            var netObj = col.GetComponent<NetworkObject>();
            if (netObj != null && netObj.IsOwner)
            {
                localPlayer = col.gameObject;
                break;
            }
        }

        if (localPlayer != null)
        {
            if (!_playerWasNearby)
            {
                _playerWasNearby = true;
                if (_dialogue != null)
                    _dialogue.SetPlayerNearby(true);
            }
        }
        else
        {
            if (_playerWasNearby)
            {
                _playerWasNearby = false;
                if (_dialogue != null)
                    _dialogue.SetPlayerNearby(false);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Interact press -- only checks the LOCAL player on each client
    // Prevents two clients both firing RequestInteractServerRpc simultaneously
    // -------------------------------------------------------------------------
    void CheckForInteractPress()
    {
        Collider[] nearby = Physics.OverlapSphere(transform.position, interactionRange);

        foreach (Collider col in nearby)
        {
            if (!col.CompareTag("Player")) continue;

            // Only care about the local player on this client
            var netObj = col.GetComponent<NetworkObject>();
            if (netObj == null || !netObj.IsOwner) continue;

            float dist = Vector3.Distance(transform.position, col.transform.position);
            if (dist > interactionRange) continue;

            StarterAssetsInputs playerInput = col.GetComponent<StarterAssetsInputs>();
            if (playerInput != null && playerInput.interact)
            {
                playerInput.interact = false;

                if (_dialogue != null)
                    _dialogue.RequestInteractFromController(netObj.OwnerClientId);

                StartTalking(col.transform);
            }

            break; // found local player, no need to continue
        }
    }

    // -------------------------------------------------------------------------
    void UpdatePatrol()
    {
        if (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance + 0.1f)
        {
            state = ScientistState.Idle;
            stateTimer = idleTimeAtPatrolPoint;
            agent.isStopped = true;
        }
    }

    void SetRandomPatrolDestination()
    {
        Vector2 randomCircle = Random.insideUnitCircle * patrolRadius;
        Vector3 candidate = homePosition + new Vector3(randomCircle.x, 0f, randomCircle.y);

        if (NavMesh.SamplePosition(candidate, out NavMeshHit hit, 3f, NavMesh.AllAreas))
            agent.SetDestination(hit.position);
        else
            agent.SetDestination(candidate);

        agent.isStopped = false;
    }

    void UpdateIdle()
    {
        stateTimer -= Time.deltaTime;
        transform.Rotate(Vector3.up, 30f * Time.deltaTime);

        if (stateTimer <= 0f)
        {
            state = ScientistState.Patrol;
            agent.speed = patrolSpeed;
            SetRandomPatrolDestination();
        }
    }

    public void StartTalking(Transform player)
    {
        if (isTalking || isDead) return;

        isTalking = true;
        talkingToPlayer = player;
        state = ScientistState.Talk;
        agent.isStopped = true;
        agent.velocity = Vector3.zero;
    }

    void UpdateTalk()
    {
        agent.isStopped = true;
        agent.velocity = Vector3.zero;

        if (talkingToPlayer != null)
            FaceTarget(talkingToPlayer);
    }

    void FaceTarget(Transform target)
    {
        Vector3 direction = target.position - transform.position;
        direction.y = 0f;

        if (direction.sqrMagnitude > 0.001f)
        {
            Quaternion targetRotation = Quaternion.LookRotation(direction);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation,
                Time.deltaTime * facePlayerSpeed);
        }
    }

    public void StopTalking()
    {
        if (!isTalking || isDead) return;

        isTalking = false;
        talkingToPlayer = null;
        agent.isStopped = false;
        state = ScientistState.Patrol;
        agent.speed = patrolSpeed;
        SetRandomPatrolDestination();

        _playerWasNearby = false;
    }

    // -------------------------------------------------------------------------
    // Death -- called locally on every client via ScientistNPCDialogue._isDead
    // Do NOT call this directly from TaskManager -- use npc1Dialogue.SyncKillNPC()
    // -------------------------------------------------------------------------
    public void KillNPC()
    {
        if (isDead) return;
        isDead = true;
        state = ScientistState.Dead;

        isTalking = false;
        talkingToPlayer = null;

        if (agent != null)
        {
            agent.isStopped = true;
            agent.velocity = Vector3.zero;
            agent.enabled = false;
        }

        if (animator != null && !string.IsNullOrEmpty(dieParam))
            animator.SetTrigger(dieParam);

        if (_dialogue != null)
            _dialogue.SetPlayerNearby(false);

        if (NPCDialogueUI.Instance != null)
            NPCDialogueUI.Instance.HideDialogue();

        enabled = false;
        Debug.Log($"[ScientistNPCController] {gameObject.name} is dead.");
    }

    // -------------------------------------------------------------------------
    void UpdateAnimationFromAgent()
    {
        if (animator == null) return;
        float speed = isTalking ? 0f : agent.velocity.magnitude;
        animator.SetFloat(speedParam, speed);
    }

    void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.cyan;
        Gizmos.DrawWireSphere(transform.position, interactionRange);
        Gizmos.color = Color.yellow;
        Vector3 home = Application.isPlaying ? homePosition : transform.position;
        Gizmos.DrawWireSphere(home, patrolRadius);
    }
}
