using UnityEngine;
using UnityEngine.AI;
using System.Collections;

public class AILocomotion : MonoBehaviour
{
    enum AIState { Patrol, Chase, Search }
    [SerializeField] AIState state = AIState.Patrol;

    [Header("Agent")]
    NavMeshAgent agent;
    public float agentAcceleration = 8f;
    public float agentAngularSpeed = 720f;
    public float agentStoppingDistance = 0.2f;

    [Header("Detection")]
    public float viewDistance = 15f;
    [Range(0, 180)] public float viewAngle = 90f;
    public float proximityRange = 15f;
    public LayerMask sightMask;
    public string playerTag = "Player";
    public LayerMask targetMask;     // Player layer
    public LayerMask obstacleMask;   // Walls / Environment

    [Header("Search")]
    bool seesPlayer;
    Vector3 lastSeenPlayerPos;
    Transform currentTarget;
    Vector3 homePosition;
    float searchTimer;
    float currentSearchWaitTime;

    [Header("Movement")]
    public float patrolSpeed = 2f;
    public float chaseSpeed = 5f;
    public float patrolRadius = 10f;
    public float attackRange = 2f;

    [Header("Combat")]
    public float attackCooldown = 2f;
    public float attackDuration = 1.2f;
    float lastAttackTime;
    bool isAttacking;
    bool hasDealtDamageThisAttack;

    [Header("Attack Hitboxes")]
    [SerializeField] private Collider[] damageColliders;
    [Range(0, 180)] public float attackAngle = 90f; // front cone angle

    [Header("Damage Values")]

    // Light
    public float attack1Damage = 10f;
    public float attack1LSpikeDamage = 12f;
    public float attack1RSpikeDamage = 12f;

    // Combo
    public float attack2HitDamage = 8f;
    public float attack2SpikeDamage = 12f;

    // Heavy
    public float attack3Damage = 22f;
    public float attack3RSpikeDamage = 28f;

    // Special
    public float attack4Damage = 35f;
    public float attack4RSpikeDamage = 45f;

    // Ultimate
    public float attack5Damage = 60f;
    public float attack5LSpikeDamage = 75f;

    float currentAttackDamage;

    [Header("Forward Damage Area")]
    public bool useForwardDamageArea = true;
    public float forwardDamageDistance = 2f;
    public float forwardDamageRadius = 1.2f;
    public float forwardDamageAngle = 90f;

    [Header("Attack Facing")]
    public float attackTurnSpeed = 10f;

    [Header("Animation")]
    public string speedParam = "Speed";
    Animator animator;

    [Header("Regeneration")]
    public bool enableRegen = true;
    public float regenPerSecond = 1f;

    private Health health;

    [Header("Debug Gizmos")]

    // Core State
    public bool showState = true;

    // Detection
    public bool showDetectionOrigin = true;   // eye position
    public bool showViewDistance = true;
    public bool showViewCone = true;
    public bool showProximity = true;

    // Combat
    public bool showAttackRange = true;
    public bool showAttackCone = true;
    public bool showForward = true;
    public bool showForwardDamageArea = true; // new
    public bool showDamageColliders = true;   // new
    public bool showAttackIndicator = true;

    // Targets & Memory
    public bool showCurrentTarget = true;
    public bool showLastSeen = true;

    // Navigation
    public bool showHome = true;
    public bool showNavDestination = true;
    public bool showSearchCenter = true;  // renamed from showSearchArea

    void Start()
    {
        agent = GetComponent<NavMeshAgent>();
        animator = GetComponent<Animator>();
        
        // if (health != null)
        // {
        //     maxHealth = health.GetMaxHealth();
        // }

		// healthBar.SetMaxHealth(maxHealth);
        // UpdateModelByHealth();

        homePosition = transform.position;
        state = AIState.Patrol;

        animator.speed = 1f; // ensures animation not slowed

        agent.updateRotation = false;
        agent.acceleration = agentAcceleration;
        agent.angularSpeed = agentAngularSpeed;
        agent.stoppingDistance = agentStoppingDistance;

        health = GetComponent<Health>();
    }
    
    // ===================== BRAIN =====================

    void Update()
    {
        if (agent == null || animator == null)
        {
            return;
        }

        // UpdateModelByHealth();
        
        Transform detected = DetectPlayer();
        seesPlayer = detected != null;

        if (seesPlayer)
        {
            currentTarget = detected;
            lastSeenPlayerPos = detected.position;
            state = AIState.Chase;
        }

        UpdateState();

        HandlePhysicalMovement();
        HandleRotation();

        HandleRegeneration();
    }

    void UpdateState()
    {
        switch (state)
        {
            case AIState.Patrol:
                agent.speed = patrolSpeed;
                UpdatePatrol();
                break;

            case AIState.Chase:
                agent.speed = chaseSpeed;
                UpdateChase(seesPlayer);
                break;

            case AIState.Search:
                agent.speed = patrolSpeed;
                UpdateSearch();
                break;
        }
    }


    // ===================== MOVEMENT CONTROL =====================
   void HandlePhysicalMovement()
    {
        if (IsInLocomotionState())
        {
            agent.isStopped = false;

            float currentSpeed = agent.velocity.magnitude;
            animator.SetFloat(speedParam, currentSpeed, 0.1f, Time.deltaTime);
        }
        else
        {
            agent.isStopped = true;
            animator.SetFloat(speedParam, 0f);
        }
    }


    bool IsInLocomotionState()
    {
        AnimatorStateInfo stateInfo = animator.GetCurrentAnimatorStateInfo(0);
        return stateInfo.IsTag("Locomotion");
    }

    void HandleRotation()
    {
        if (agent.velocity.sqrMagnitude > 0.1f && !isAttacking)
        {
            Quaternion targetRot = Quaternion.LookRotation(agent.velocity.normalized);
            transform.rotation = Quaternion.Slerp(
                transform.rotation,
                targetRot,
                Time.deltaTime * 10f
            );
        }
    }


    // ===================== DETECTION =====================
    Transform DetectPlayer()
    {
        Vector3 origin = transform.position + Vector3.up * 1.6f;

        Collider[] hits = Physics.OverlapSphere(origin, viewDistance);

        foreach (Collider col in hits)
        {
            Transform root = col.transform.root;

            if (!root.CompareTag(playerTag))
                continue;

            Vector3 target = col.bounds.center;
            Vector3 dir = target - origin;
            float distance = dir.magnitude;

            float angle = Vector3.Angle(transform.forward, dir);
            if (angle > viewAngle * 0.5f)
                continue;

            // Raycast against EVERYTHING
            if (Physics.Raycast(origin, dir.normalized, out RaycastHit hit, distance))
            {
                // Only detect if first thing hit is player (or its child)
                if (hit.transform.root.CompareTag(playerTag))
                {
                    Debug.DrawLine(origin, hit.point, Color.green);
                    return root;
                }
                else
                {
                    Debug.DrawLine(origin, hit.point, Color.red);
                }
            }
        }

        return null;
    }

    // ===================== CHASE =====================
    void UpdateChase(bool seesPlayer)
    {
        if (currentTarget == null)
        {
            EnterSearch();
            return;
        }

        float dist = Vector3.Distance(transform.position, currentTarget.position);
        agent.speed = chaseSpeed;

        if (dist <= attackRange)
        {
            if (!isAttacking && Time.time >= lastAttackTime + attackCooldown)
            {
                StartCoroutine(PerformAttack());
            }
        }
        else
        {
            if (!isAttacking)
            {
                agent.SetDestination(currentTarget.position);
            }
        }

        if (!seesPlayer)
        {
            EnterSearch();
        }
    }

    // ===================== ATTACK =====================
    IEnumerator PerformAttack()
    {
        isAttacking = true;
        hasDealtDamageThisAttack = false;
        lastAttackTime = Time.time;

        agent.ResetPath();
        agent.isStopped = true;

        TriggerRandomAttack();

        float timer = 0f;

        while (timer < attackDuration)
        {
            timer += Time.deltaTime;

            if (currentTarget != null)
            {
                FaceTargetAttack(currentTarget.position);
                TryDealDamage();
            }

            yield return null;
        }

        agent.isStopped = false;
        isAttacking = false;
    }

    void HandleRegeneration()
    {
        if (!enableRegen) return;
        if (health == null) return;
        if (health.IsDead()) return;

        // Only heal if NOT chasing
        if (state == AIState.Chase)
            return;

        // IMPORTANT: Heal only on server
        if (!Unity.Netcode.NetworkManager.Singleton.IsServer)
            return;

        float current = health.GetCurrentHealth();
        float max = health.GetMaxHealth();

        if (current >= max)
            return;

        float healAmount = regenPerSecond * Time.deltaTime;

        // Negative damage = heal (clean reuse of your system)
        health.TakeDamage(-healAmount);
    }

    void TryDealDamage()
    {
        if (hasDealtDamageThisAttack) return;
        if (currentTarget == null) return;

        // ================= COLLIDER DAMAGE =================
        if (damageColliders != null && damageColliders.Length > 0)
        {
            foreach (Collider attackCol in damageColliders)
            {
                if (attackCol == null || !attackCol.enabled)
                    continue;

                Collider[] overlaps = Physics.OverlapBox(
                    attackCol.bounds.center,
                    attackCol.bounds.extents,
                    attackCol.transform.rotation
                );

                foreach (Collider hit in overlaps)
                {
                    if (TryApplyDamage(hit.transform.root))
                        return;
                }
            }
        }

        // ================= FORWARD AREA DAMAGE =================
        if (useForwardDamageArea)
        {
            Vector3 center = transform.position + transform.forward * forwardDamageDistance * 0.5f;

            Collider[] hits = Physics.OverlapSphere(center, forwardDamageRadius);

            foreach (Collider hit in hits)
            {
                Transform root = hit.transform.root;

                if (!root.CompareTag(playerTag))
                    continue;

                Vector3 dir = (root.position - transform.position).normalized;
                float angle = Vector3.Angle(transform.forward, dir);

                if (angle > forwardDamageAngle * 0.5f)
                    continue;

                if (TryApplyDamage(root))
                    return;
            }
        }
    }

    bool TryApplyDamage(Transform root)
    {
        if (!root.CompareTag(playerTag))
            return false;

        Health health = root.GetComponent<Health>();

        if (health == null)
            return false;

        health.TakeDamage(currentAttackDamage);
        hasDealtDamageThisAttack = true;

        Debug.Log($"{name} dealt {currentAttackDamage} damage to {root.name}");
        return true;
    }
    
    void FaceTargetAttack(Vector3 target)
    {
        Vector3 dir = (target - transform.position).normalized;
        dir.y = 0;

        if (dir == Vector3.zero)
            return;

        Quaternion targetRot = Quaternion.LookRotation(dir);
        transform.rotation = Quaternion.Slerp(
            transform.rotation,
            targetRot,
            Time.deltaTime * attackTurnSpeed
        );
    }

    void TriggerRandomAttack()
    {
        int attackIndex = Random.Range(1, 13);

        switch (attackIndex)
        {
            case 1:
                animator.SetTrigger("Attack1");
                currentAttackDamage = attack1Damage;
                break;

            case 2:
                animator.SetTrigger("Attack1LSpike");
                currentAttackDamage = attack1LSpikeDamage;
                break;

            case 3:
                animator.SetTrigger("Attack1RSpike");
                currentAttackDamage = attack1RSpikeDamage;
                break;

            case 4:
                animator.SetTrigger("Attack2");
                currentAttackDamage = attack2HitDamage * 2f; // 8 + 8
                break;

            case 5:
                animator.SetTrigger("Attack2LSpike");
                currentAttackDamage = attack2HitDamage + attack2SpikeDamage; // 8 + 12
                break;

            case 6:
                animator.SetTrigger("Attack2RLSpike");
                currentAttackDamage = attack2SpikeDamage * 2f; // 12 + 12
                break;

            case 7:
                animator.SetTrigger("Attack3");
                currentAttackDamage = attack3Damage;
                break;

            case 8:
                animator.SetTrigger("Attack3RSpike");
                currentAttackDamage = attack3RSpikeDamage;
                break;

            case 9:
                animator.SetTrigger("Attack4");
                currentAttackDamage = attack4Damage;
                break;

            case 10:
                animator.SetTrigger("Attack4RSpike");
                currentAttackDamage = attack4RSpikeDamage;
                break;

            case 11:
                animator.SetTrigger("Attack5");
                currentAttackDamage = attack5Damage;
                break;

            case 12:
                animator.SetTrigger("Attack5LSpike");
                currentAttackDamage = attack5LSpikeDamage;
                break;
        }
    }

    // ===================== PATROL =====================
    void UpdatePatrol()
    {
        agent.speed = patrolSpeed;

        if (!agent.pathPending &&
            agent.remainingDistance <= agent.stoppingDistance + 0.1f)
        {
            SetRandomPatrolPoint();
        }
    }

    // ===================== SEARCH =====================
    void UpdateSearch()
    {
        agent.speed = patrolSpeed;

        if (searchPointsVisited >= maxSearchPoints)
        {
            currentTarget = null;
            state = AIState.Patrol;
            return;
        }

        if (!movingToSearchPoint)
        {
            Vector2 randomCircle = Random.insideUnitCircle * 4f;
            Vector3 nextPoint = searchCenter + new Vector3(randomCircle.x, 0, randomCircle.y);

            agent.SetDestination(nextPoint);
            movingToSearchPoint = true;
        }

        if (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance + 0.2f)
        {
            waitTimer += Time.deltaTime;
            transform.Rotate(0, Time.deltaTime * 40f, 0);


            // Stand still briefly like "listening"
            if (waitTimer >= currentSearchWaitTime)
            {
                searchPointsVisited++;
                movingToSearchPoint = false;
                waitTimer = 0f;
            }
        }
    }


    Vector3 searchCenter;
    int searchPointsVisited;
    int maxSearchPoints = 5;
    bool movingToSearchPoint;
    float waitTimer;

    void EnterSearch()
    {
        state = AIState.Search;

        searchCenter = lastSeenPlayerPos;
        searchPointsVisited = 0;
        movingToSearchPoint = false;
        waitTimer = 0f;
        currentSearchWaitTime = Random.Range(0.8f, 1.5f);
    }

    void SetRandomPatrolPoint()
    {
        Vector2 rand = Random.insideUnitCircle * patrolRadius;
        Vector3 target = homePosition + new Vector3(rand.x, 0, rand.y);
        agent.SetDestination(target);
    }

    //===================== ANIMATION ====================

    // void UpdateAnimation()
    // {   
    //     float speedPercent = agent.velocity.magnitude / agent.speed;
    //     animator.SetFloat("Speed", speedPercent * agent.speed, 0.1f, Time.deltaTime);
    // }

    // void SetupModel(int index)
    // {
    //     if (modelPrefabs == null || modelPrefabs.Length == 0)
    //         return;

    //     if (index < 0 || index >= modelPrefabs.Length)
    //         return;

    //     // Clear old model
    //     if (modelHolder.childCount > 0)
    //     {
    //         for (int i = modelHolder.childCount - 1; i >= 0; i--)
    //         {
    //             Destroy(modelHolder.GetChild(i).gameObject);
    //         }
    //     }

    //     GameObject modelInstance = Instantiate(
    //         modelPrefabs[index],
    //         modelHolder
    //     );

    //     modelInstance.transform.localPosition = Vector3.zero;
    //     modelInstance.transform.localRotation = Quaternion.identity;

    //     animator = modelInstance.GetComponentInChildren<Animator>();

    //     // Only collect colliders marked as damage
    //     damageColliders = modelInstance.GetComponentsInChildren<Collider>();
    // }

    // public void UpdateModelByHealth()
    // {
    //     if (health == null)
    //         return;

    //     float healthPercent =
    //         health.GetCurrentHealth() / maxHealth;

    //     int newStage = 0;

    //     if (healthPercent <= stage4Threshold)
    //         newStage = 3;
    //     else if (healthPercent <= stage3Threshold)
    //         newStage = 2;
    //     else if (healthPercent <= stage2Threshold)
    //         newStage = 1;
    //     else
    //         newStage = 0;

    //     if (newStage != currentModelStage)
    //     {
    //         currentModelStage = newStage;
    //         SetupModel(newStage);
    //     }
    // }

    // ===================== GIZMOS =====================
    void OnDrawGizmos()
    {
        Vector3 pos = transform.position;
        Vector3 eyePos = pos + Vector3.up * 1.6f;

        // ===== STATE CORE =====
        if (showState)
        {
            switch (state)
            {
                case AIState.Patrol: Gizmos.color = Color.green; break;
                case AIState.Chase: Gizmos.color = Color.red; break;
                case AIState.Search: Gizmos.color = Color.yellow; break;
            }

            Gizmos.DrawWireSphere(pos, 0.5f);
        }

        // ===== DETECTION ORIGIN (EYE) =====
        Gizmos.color = Color.white;
        Gizmos.DrawSphere(eyePos, 0.1f);

        // ===== VIEW DISTANCE =====
        if (showViewDistance)
        {
            Gizmos.color = Color.cyan;
            Gizmos.DrawWireSphere(eyePos, viewDistance);
        }

        // ===== VIEW CONE =====
        if (showViewCone)
        {
            DrawArc(eyePos, viewDistance, viewAngle, Color.cyan);
        }

        // ===== PROXIMITY =====
        if (showProximity)
        {
            Gizmos.color = Color.magenta;
            Gizmos.DrawWireSphere(pos, proximityRange);
        }

        // ===== ATTACK RANGE =====
        if (showAttackRange)
        {
            Gizmos.color = Color.red;
            Gizmos.DrawWireSphere(pos, attackRange);
        }

        // ===== ATTACK CONE =====
        if (showAttackCone)
        {
            DrawArc(pos, attackRange, attackAngle, Color.red);
        }

        // ===== FORWARD DIRECTION =====
        if (showForward)
        {
            Gizmos.color = Color.white;
            Gizmos.DrawLine(pos, pos + transform.forward * 2f);
        }

        // ===== FORWARD DAMAGE AREA =====
        if (useForwardDamageArea)
        {
            Vector3 forwardCenter =
                pos + transform.forward * forwardDamageDistance * 0.5f;

            Gizmos.color = new Color(1f, 0.5f, 0f, 0.6f);
            Gizmos.DrawWireSphere(forwardCenter, forwardDamageRadius);

            DrawArc(pos, forwardDamageDistance, forwardDamageAngle,
                new Color(1f, 0.5f, 0f, 0.6f));
        }

        // ===== DAMAGE COLLIDERS (OVERLAP BOXES) =====
        if (showDamageColliders && damageColliders != null)
        {
            foreach (Collider col in damageColliders)
            {
                if (col == null) continue;

                BoxCollider box = col as BoxCollider;
                if (box == null) continue;

                Gizmos.color = new Color(1f, 0f, 0f, 0.6f);

                Matrix4x4 matrix = Matrix4x4.TRS(
                    box.transform.position,
                    box.transform.rotation,
                    box.transform.lossyScale
                );

                Gizmos.matrix = matrix;

                Gizmos.DrawWireCube(
                    box.center,
                    box.size
                );

                Gizmos.matrix = Matrix4x4.identity;
            }
        }


        // ===== CURRENT TARGET =====
        if (showCurrentTarget && currentTarget != null)
        {
            Gizmos.color = Color.white;
            Gizmos.DrawLine(pos, currentTarget.position);
            Gizmos.DrawSphere(currentTarget.position, 0.25f);
        }

        // ===== LAST SEEN POSITION =====
        if (showLastSeen && lastSeenPlayerPos != Vector3.zero)
        {
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(lastSeenPlayerPos, 0.3f);
        }

        // ===== SEARCH CENTER =====
        if (showSearchCenter && state == AIState.Search)
        {
            Gizmos.color = new Color(1f, 1f, 0f, 0.5f);
            Gizmos.DrawWireSphere(searchCenter, 4f);
        }


        // ===== HOME POSITION =====
        if (showHome)
        {
            Gizmos.color = Color.blue;
            Gizmos.DrawWireSphere(homePosition, 0.4f);
        }

        // ===== NAV DESTINATION =====
        if (showNavDestination && agent != null && agent.hasPath)
        {
            Gizmos.color = Color.blue;
            Gizmos.DrawLine(pos, agent.destination);
            Gizmos.DrawSphere(agent.destination, 0.2f);
        }

        // ===== ATTACK INDICATOR =====
        if (showAttackIndicator && isAttacking)
        {
            Gizmos.color = new Color(1f, 0f, 0f, 0.3f);
            Gizmos.DrawSphere(
                pos + transform.forward * (attackRange * 0.5f),
                0.3f
            );
        }
    }


    // ================= ARC DRAWER =================
    void DrawArc(Vector3 center, float radius, float angle, Color color)
    {
        Gizmos.color = color;

        int segments = 40;
        float step = angle / segments;

        Vector3 prevPoint = center +
            Quaternion.Euler(0, -angle * 0.5f, 0) * transform.forward * radius;

        for (int i = 1; i <= segments; i++)
        {
            float currentAngle = -angle * 0.5f + step * i;

            Vector3 nextPoint = center +
                Quaternion.Euler(0, currentAngle, 0) * transform.forward * radius;

            Gizmos.DrawLine(prevPoint, nextPoint);
            prevPoint = nextPoint;
        }

        Vector3 leftDir = Quaternion.Euler(0, -angle * 0.5f, 0) * transform.forward;
        Vector3 rightDir = Quaternion.Euler(0, angle * 0.5f, 0) * transform.forward;

        Gizmos.DrawLine(center, center + leftDir * radius);
        Gizmos.DrawLine(center, center + rightDir * radius);
    }

}






























