using System.Collections.Generic;
using Unity.Netcode;
using UnityEngine;
using UnityEngine.AI;

[RequireComponent(typeof(NavMeshAgent))]
public class ImpostorPlayerAI : NetworkBehaviour
{
    [Header("Movement")]
    public float walkSpeed = 3f;
    public float runSpeed = 5f;
    public float acceleration = 5f;

    [Header("AI Behavior - Social Distances")]
    public float detectionRadius = 25f;
    public float approachDistance = 8f;
    public float conversationDistance = 2.5f;
    public float personalSpaceDistance = 1.2f;

    [Header("AI Behavior - Timers")]
    public float minSocialTime = 8f;
    public float maxSocialTime = 20f;
    public float idleWanderInterval = 5f;
    public float socialWanderInterval = 8f;

    [Header("AI Behavior - Movement")]
    public float nearPlayerWanderRadius = 4f;
    public float farWanderRadius = 15f;
    public float arrivalThreshold = 0.8f;
    public float stopMovingThreshold = 0.3f;

    [Header("Target Group Settings")]
    public float groupArrivalDistance = 10f;
    public float groupFollowUpdateInterval = 1f;

    [Header("Look At Settings")]
    public float lookAtSpeed = 3f;
    public float lookAtDistance = 5f;

    [Header("Leave Settings")]
    public float leaveDistance = 90f; // NEW: How far to walk when leaving

    [Header("Ground Check")]
    public Transform groundCheck;
    public LayerMask groundMask;
    public float groundDistance = 0.2f;

    [Header("Obstacle / Sensor")]
    public LayerMask obstacleMask;
    public float obstacleCheckDistance = 1f;

    [Header("Debug")]
    public bool showDebugInfo = true;

    private NavMeshAgent agent;
    private Animator anim;
    private Vector3 lastPosition;
    private bool isGrounded;
    private float currentSpeed = 0f;
    private float currentDirection = 0f;
    private float movementMagnitude = 0f;

    private enum AIState
    {
        MovingToGroup,
        Wandering,
        Approaching,
        Socializing,
        Stopping,
        Leaving
    }

    private AIState currentState = AIState.MovingToGroup;
    private Transform targetPlayer;
    private Vector3 wanderTarget;
    private float stateTimer;
    private float socialTimer;
    private bool hasApproachedPlayer = false;
    private bool isInitialized = false;

    private Vector3 targetGroupCenter = Vector3.zero;
    private bool hasTargetGroup = false;
    private bool hasReachedGroup = false;
    private float lastGroupUpdateTime = 0f;

    private HashSet<string> targetGroupPlayerNames = new HashSet<string>();

    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();
        if (IsServer)
            Invoke(nameof(InitializeAI), 0.2f);
    }

    void Start()
    {
        agent = GetComponent<NavMeshAgent>();
        if (agent == null)
        {
            Debug.LogError("ImpostorPlayerAI: NavMeshAgent missing.");
            enabled = false;
            return;
        }

        anim = GetComponentInChildren<Animator>();
        InitAnimatorIDs();
        if (anim == null)
            Debug.LogWarning("ImpostorPlayerAI: Animator not found in children.");

        agent.updatePosition = true;
        agent.updateRotation = false;
        lastPosition = transform.position;
    }

    public void SetTargetGroup(Vector3 groupCenter, string[] groupMemberNames = null)
    {
        targetGroupCenter = groupCenter;
        hasTargetGroup = true;
        hasReachedGroup = false;
        lastGroupUpdateTime = Time.time;

        targetGroupPlayerNames.Clear();
        if (groupMemberNames != null)
        {
            foreach (string name in groupMemberNames)
            {
                if (!string.IsNullOrEmpty(name))
                    targetGroupPlayerNames.Add(name);
            }
        }

        if (showDebugInfo)
        {
            Debug.Log($"[ImpostorAI] 🎯 Target group set at {groupCenter:F1}");
            Debug.Log($"[ImpostorAI] Distance: {Vector3.Distance(transform.position, groupCenter):F1}m");
            Debug.Log($"[ImpostorAI] Target group members: {string.Join(", ", targetGroupPlayerNames)}");
        }

        if (isInitialized)
        {
            ChangeState(AIState.MovingToGroup);
            agent.speed = walkSpeed;
            agent.SetDestination(targetGroupCenter);
        }
    }

    public void UpdateTargetGroupPosition(Vector3 newGroupCenter, string[] groupMemberNames = null)
    {
        if (!hasTargetGroup)
            return;

        float distanceFromOldCenter = Vector3.Distance(targetGroupCenter, newGroupCenter);

        if (distanceFromOldCenter > 2f)
        {
            targetGroupCenter = newGroupCenter;
            lastGroupUpdateTime = Time.time;

            if (showDebugInfo)
                Debug.Log($"[ImpostorAI] 📍 Target group moved to {newGroupCenter:F1} (moved {distanceFromOldCenter:F1}m)");

            if (groupMemberNames != null)
            {
                targetGroupPlayerNames.Clear();
                foreach (string name in groupMemberNames)
                {
                    if (!string.IsNullOrEmpty(name))
                        targetGroupPlayerNames.Add(name);
                }
            }

            if (hasReachedGroup && distanceFromOldCenter > groupArrivalDistance)
            {
                hasReachedGroup = false;
                ChangeState(AIState.MovingToGroup);
                agent.speed = walkSpeed;
                agent.SetDestination(targetGroupCenter);

                if (showDebugInfo)
                    Debug.Log($"[ImpostorAI] 🏃 Group moved too far, chasing again!");
            }
            else if (!hasReachedGroup)
            {
                agent.SetDestination(targetGroupCenter);
            }
        }
    }

    void InitializeAI()
    {
        if (isInitialized) return;

        stateTimer = idleWanderInterval;
        socialTimer = 0f;

        if (hasTargetGroup)
        {
            ChangeState(AIState.MovingToGroup);
            agent.speed = walkSpeed;
            agent.SetDestination(targetGroupCenter);
            if (showDebugInfo)
                Debug.Log($"[ImpostorAI] INITIALIZED - Moving to target group at {targetGroupCenter:F1}");
        }
        else
        {
            PickWanderPoint(transform.position, farWanderRadius);
            agent.speed = walkSpeed;
            agent.SetDestination(wanderTarget);
            ChangeState(AIState.Wandering);
            if (showDebugInfo)
                Debug.Log($"[ImpostorAI] INITIALIZED - No target, wandering");
        }

        isInitialized = true;
    }

    void Update()
    {
        if (!IsServer || !isInitialized) return;

        CheckGrounded();
        UpdateAIBehavior();
        ApplyRaycastSensor();
        UpdateLookAt();
        UpdateAnimations();

        if (showDebugInfo && Time.frameCount % 120 == 0)
        {
            Debug.Log($"[ImpostorAI] State={currentState} Pos={transform.position:F1} Target={(targetPlayer ? targetPlayer.name : "NONE")} HasGroup={hasTargetGroup} ReachedGroup={hasReachedGroup}");
        }
    }

    void CheckGrounded()
    {
        if (groundCheck != null)
            isGrounded = Physics.CheckSphere(groundCheck.position, groundDistance, groundMask);
        else
            isGrounded = Physics.Raycast(transform.position + Vector3.up * 0.1f, Vector3.down, 0.3f, groundMask);
    }

    void UpdateAIBehavior()
    {
        // When leaving, don't do anything else
        if (currentState == AIState.Leaving)
        {
            HandleLeaving();
            return;
        }

        if (hasTargetGroup && !hasReachedGroup)
        {
            HandleMovingToGroup();
            return;
        }

        targetPlayer = FindNearestTargetGroupPlayer();

        if (targetPlayer != null)
        {
            float dist = Vector3.Distance(transform.position, targetPlayer.position);
            HandlePlayerInteraction(dist);
        }
        else
        {
            HandleSoloWandering();
        }

        stateTimer -= Time.deltaTime;
    }

    void HandleMovingToGroup()
    {
        if (currentState != AIState.MovingToGroup)
        {
            ChangeState(AIState.MovingToGroup);
            agent.speed = walkSpeed;
            agent.SetDestination(targetGroupCenter);
        }

        float distToGroup = Vector3.Distance(transform.position, targetGroupCenter);

        if (showDebugInfo && Time.frameCount % 60 == 0)
        {
            Debug.Log($"[ImpostorAI] 🚶 Moving to group... Distance: {distToGroup:F1}m");
        }

        if (distToGroup < groupArrivalDistance)
        {
            hasReachedGroup = true;
            ChangeState(AIState.Wandering);

            if (showDebugInfo)
            {
                Debug.Log($"[ImpostorAI] ✅ ARRIVED at target group!");
                Debug.Log($"[ImpostorAI] Now switching to social behavior...");
            }

            PickWanderPoint(targetGroupCenter, nearPlayerWanderRadius);
            agent.SetDestination(wanderTarget);
        }
        else
        {
            agent.speed = walkSpeed;

            if ((Time.time - lastGroupUpdateTime) < groupFollowUpdateInterval)
            {
                agent.SetDestination(targetGroupCenter);
            }
        }
    }

    void HandlePlayerInteraction(float distToPlayer)
    {
        if (currentState == AIState.Leaving)
            return;

        if (distToPlayer < personalSpaceDistance)
        {
            if (currentState != AIState.Stopping)
                ChangeState(AIState.Stopping);

            agent.ResetPath();
            FaceTarget(targetPlayer.position);
            socialTimer += Time.deltaTime;
            return;
        }

        if (distToPlayer < conversationDistance)
        {
            socialTimer += Time.deltaTime;

            if (currentState != AIState.Socializing)
            {
                ChangeState(AIState.Socializing);
                socialTimer = 0f;
                stateTimer = socialWanderInterval;
                PickWanderPoint(targetPlayer.position, nearPlayerWanderRadius);
            }

            if (socialTimer < minSocialTime)
            {
                agent.ResetPath();
                FaceTarget(targetPlayer.position);
            }
            else
            {
                float distToWander = Vector3.Distance(transform.position, wanderTarget);
                if (distToWander < stopMovingThreshold)
                {
                    FaceTarget(targetPlayer.position);
                    if (stateTimer <= 0f)
                    {
                        PickWanderPoint(targetPlayer.position, nearPlayerWanderRadius);
                        stateTimer = socialWanderInterval;
                    }
                    agent.ResetPath();
                }
                else
                {
                    agent.speed = walkSpeed * 0.6f;
                    agent.SetDestination(wanderTarget);
                }
            }

            if (socialTimer > maxSocialTime)
            {
                ChangeState(AIState.Wandering);
                PickWanderPoint(transform.position, farWanderRadius);
                agent.speed = walkSpeed;
                agent.SetDestination(wanderTarget);
                hasApproachedPlayer = false;
                socialTimer = 0f;
            }

            return;
        }

        if (distToPlayer < approachDistance)
        {
            if (currentState != AIState.Approaching && currentState != AIState.Socializing)
            {
                ChangeState(AIState.Approaching);
                hasApproachedPlayer = true;
            }

            if (currentState == AIState.Approaching)
            {
                agent.speed = walkSpeed;
                agent.SetDestination(targetPlayer.position);
            }

            return;
        }

        if (distToPlayer < detectionRadius)
        {
            if (currentState == AIState.Wandering && !hasApproachedPlayer)
            {
                ChangeState(AIState.Approaching);
                hasApproachedPlayer = true;
            }
            else if (currentState == AIState.Approaching)
            {
                agent.speed = walkSpeed;
                agent.SetDestination(targetPlayer.position);
            }

            return;
        }

        if (currentState != AIState.Wandering && currentState != AIState.MovingToGroup)
            HandleSoloWandering();
    }

    void HandleSoloWandering()
    {
        if (currentState == AIState.MovingToGroup || currentState == AIState.Leaving)
            return;

        if (currentState != AIState.Wandering)
        {
            ChangeState(AIState.Wandering);

            if (hasTargetGroup && hasReachedGroup)
            {
                PickWanderPoint(targetGroupCenter, nearPlayerWanderRadius);
            }
            else
            {
                PickWanderPoint(transform.position, farWanderRadius);
            }

            stateTimer = idleWanderInterval;
            socialTimer = 0f;
            hasApproachedPlayer = false;
        }

        float distToWander = Vector3.Distance(transform.position, wanderTarget);

        if (float.IsNaN(wanderTarget.x) || wanderTarget == Vector3.zero)
        {
            if (hasTargetGroup && hasReachedGroup)
                PickWanderPoint(targetGroupCenter, nearPlayerWanderRadius);
            else
                PickWanderPoint(transform.position, farWanderRadius);

            stateTimer = idleWanderInterval;
            return;
        }

        if (distToWander < stopMovingThreshold)
        {
            if (stateTimer <= 0f)
            {
                if (hasTargetGroup && hasReachedGroup)
                    PickWanderPoint(targetGroupCenter, nearPlayerWanderRadius);
                else
                    PickWanderPoint(transform.position, farWanderRadius);

                stateTimer = idleWanderInterval;
            }
            agent.ResetPath();
        }
        else
        {
            agent.speed = walkSpeed;
            agent.SetDestination(wanderTarget);
        }
    }

    /// <summary>
    /// NEW: Handle leaving behavior - just keep walking away
    /// </summary>
    void HandleLeaving()
    {
        // Just keep moving to the leave destination
        // Backend will despawn us after walkAwayDuration

        if (showDebugInfo && Time.frameCount % 60 == 0)
        {
            float distToLeavePoint = Vector3.Distance(transform.position, wanderTarget);
            Debug.Log($"[ImpostorAI] 🚶‍♂️ Walking away... Distance to leave point: {distToLeavePoint:F1}m");
        }

        // Keep walking
        agent.speed = walkSpeed;
    }

    void UpdateLookAt()
    {
        // Don't look at players when leaving
        if (currentState == AIState.Leaving)
            return;

        if (currentState != AIState.Stopping && currentState != AIState.Socializing && currentState != AIState.Wandering)
            return;

        Transform closestPlayer = FindNearestTargetGroupPlayer();

        if (closestPlayer != null)
        {
            float dist = Vector3.Distance(transform.position, closestPlayer.position);

            if (dist < lookAtDistance)
            {
                Vector3 direction = closestPlayer.position - transform.position;
                direction.y = 0f;

                if (direction.sqrMagnitude > 0.01f)
                {
                    Quaternion targetRotation = Quaternion.LookRotation(direction);
                    transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, Time.deltaTime * lookAtSpeed);
                }
            }
        }
    }

    /// <summary>
    /// UPDATED: Pick a far destination away from players
    /// </summary>
    public void LeaveArea()
    {
        if (showDebugInfo)
            Debug.Log($"[ImpostorAI] 👋 Leaving area...");

        ChangeState(AIState.Leaving);
        hasTargetGroup = false;
        hasReachedGroup = false;

        // Pick a point far away from current position
        Vector3 directionAway = (transform.position - targetGroupCenter).normalized;

        // If no target group, just pick random direction
        if (directionAway == Vector3.zero)
        {
            directionAway = new Vector3(Random.Range(-1f, 1f), 0f, Random.Range(-1f, 1f)).normalized;
        }

        Vector3 farPoint = transform.position + (directionAway * leaveDistance);

        // Try to find valid NavMesh position
        NavMeshHit hit;
        if (NavMesh.SamplePosition(farPoint, out hit, 10f, NavMesh.AllAreas))
        {
            wanderTarget = hit.position;
        }
        else
        {
            // Fallback: just use far point
            wanderTarget = farPoint;
        }

        agent.speed = walkSpeed * 1.2f; // Walk slightly faster when leaving
        agent.SetDestination(wanderTarget);

        if (showDebugInfo)
            Debug.Log($"[ImpostorAI] 🏃 Walking to {wanderTarget:F1} ({leaveDistance}m away)");
    }

    void ChangeState(AIState newState)
    {
        if (currentState == newState) return;

        if (showDebugInfo)
            Debug.Log($"[ImpostorAI] State: {currentState} -> {newState}");

        currentState = newState;
    }

    Transform FindNearestTargetGroupPlayer()
    {
        if (!hasReachedGroup)
            return null;

        if (NetworkManager.Singleton == null || !NetworkManager.Singleton.IsServer)
            return null;

        Transform closest = null;
        float closestDist = detectionRadius;

        foreach (var client in NetworkManager.Singleton.ConnectedClientsList)
        {
            if (client.PlayerObject == null) continue;
            if (client.PlayerObject.gameObject == gameObject) continue;

            if (client.PlayerObject.GetComponent<CharacterController>() == null)
                continue;

            string playerName = client.PlayerObject.name;

            if (targetGroupPlayerNames.Count > 0)
            {
                bool isInTargetGroup = false;
                foreach (string targetName in targetGroupPlayerNames)
                {
                    if (playerName.Contains(targetName))
                    {
                        isInTargetGroup = true;
                        break;
                    }
                }

                if (!isInTargetGroup)
                {
                    if (showDebugInfo && Time.frameCount % 120 == 0)
                        Debug.Log($"[ImpostorAI] Ignoring {playerName} (not in target group)");
                    continue;
                }
            }

            float d = Vector3.Distance(transform.position, client.PlayerObject.transform.position);
            if (d < closestDist)
            {
                closestDist = d;
                closest = client.PlayerObject.transform;
            }
        }

        return closest;
    }

    void PickWanderPoint(Vector3 centerPos, float radius)
    {
        float minDistance = 2f;
        int maxAttempts = 10;

        for (int i = 0; i < maxAttempts; i++)
        {
            Vector2 randomCircle = Random.insideUnitCircle * Random.Range(radius * 0.5f, radius);
            Vector3 candidate = centerPos + new Vector3(randomCircle.x, 0f, randomCircle.y);

            NavMeshHit hit;
            if (NavMesh.SamplePosition(candidate, out hit, 2f, NavMesh.AllAreas))
            {
                if (Vector3.Distance(transform.position, hit.position) >= minDistance)
                {
                    wanderTarget = hit.position;
                    if (showDebugInfo)
                        Debug.Log($"[ImpostorAI] New wander target: {wanderTarget:F1}");
                    return;
                }
            }
        }

        wanderTarget = centerPos;
    }

    void FaceTarget(Vector3 targetPos)
    {
        Vector3 direction = targetPos - transform.position;
        direction.y = 0f;

        if (direction.sqrMagnitude > 0.01f)
        {
            Quaternion targetRotation = Quaternion.LookRotation(direction);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, Time.deltaTime * 5f);
        }
    }

    void ApplyRaycastSensor()
    {
        if (!agent.hasPath) return;

        Vector3 desired = agent.desiredVelocity;
        desired.y = 0f;

        if (desired.sqrMagnitude < 0.0001f) return;

        desired.Normalize();
        Vector3 rayOrigin = transform.position + Vector3.up * 0.5f;
        LayerMask maskToUse = obstacleMask.value == 0 ? groundMask : obstacleMask;

        if (Physics.Raycast(rayOrigin, desired, obstacleCheckDistance, maskToUse))
        {
            Vector3 right = Vector3.Cross(Vector3.up, desired);

            if (!Physics.Raycast(rayOrigin, right, obstacleCheckDistance, maskToUse))
                desired = right;
            else if (!Physics.Raycast(rayOrigin, -right, obstacleCheckDistance, maskToUse))
                desired = -right;
            else
                desired = agent.desiredVelocity.normalized;
        }

        if (desired.sqrMagnitude > 0.01f)
        {
            Quaternion targetRot = Quaternion.LookRotation(desired);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRot, Time.deltaTime * 8f);
        }

        if (showDebugInfo)
            Debug.DrawRay(rayOrigin, desired * 2f, Color.green, 0.1f);
    }

    // Cached animator parameter hashes (same names ThirdPersonController uses)
    private int _animIDSpeed;
    private int _animIDGrounded;
    private int _animIDMotionSpeed;
    private int _animIDFreeFall;

    void InitAnimatorIDs()
    {
        _animIDSpeed = Animator.StringToHash("Speed");
        _animIDGrounded = Animator.StringToHash("Grounded");
        _animIDMotionSpeed = Animator.StringToHash("MotionSpeed");
        _animIDFreeFall = Animator.StringToHash("FreeFall");
    }

    void UpdateAnimations()
    {
        if (anim == null) return;

        // Grounded state
        anim.SetBool(_animIDGrounded, isGrounded);
        anim.SetBool(_animIDFreeFall, !isGrounded);

        // Derive speed from actual world movement (NavMeshAgent velocity)
        float horizontalSpeed = new Vector3(agent.velocity.x, 0f, agent.velocity.z).magnitude;

        // Smoothly blend toward current speed
        currentSpeed = Mathf.Lerp(currentSpeed, horizontalSpeed, Time.deltaTime * acceleration);
        movementMagnitude = currentSpeed;

        // "Speed" drives the walk/run blend tree (0 = idle, ~2 = walk, ~5 = run)
        anim.SetFloat(_animIDSpeed, currentSpeed);

        // "MotionSpeed" is the multiplier the Starter Assets blend tree expects (keep at 1)
        anim.SetFloat(_animIDMotionSpeed, currentSpeed > 0.05f ? 1f : 0f);
    }
}