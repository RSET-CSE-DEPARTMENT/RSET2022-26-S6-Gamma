using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

public class AlienMovement : MonoBehaviour
{
    // -----------------------------------------------------------------------
    // State machine
    // -----------------------------------------------------------------------
    enum AIState { Patrol, Idle, Chase, Search, Dead }

    // -----------------------------------------------------------------------
    // Inspector
    // -----------------------------------------------------------------------

    [Header("Movement")]
    public float patrolSpeed         = 2f;
    public float chaseSpeed          = 4f;

    [Header("Patrol / Idle")]
    public float patrolRadius        = 10f;
    public float idleTimeAtPoint     = 2f;

    [Header("Search")]
    public float searchDuration      = 4f;

    [Header("Attack")]
    [Tooltip("Distance from the player at which the alien can land a hit.")]
    public float attackRange         = 2f;
    public string attack1Trigger     = "Attack1Trigger";
    public string attack2Trigger     = "Attack2Trigger";
    public float attack1Cooldown     = 1.2f;
    public float attack2Cooldown     = 1.5f;
    [Tooltip("How long movement is locked while attack 1 plays.")]
    public float attack1Duration     = 0.8f;
    [Tooltip("How long movement is locked while attack 2 plays.")]
    public float attack2Duration     = 1.0f;

    [Header("Rotation")]
    public float turnSpeed           = 10f;

    [Header("Animation")]
    public Animator animator;
    public string moveXParam         = "MoveX";
    public string moveZParam         = "MoveZ";

    [Header("Sensor")]
    public AlienSensor sensor;

    [Header("Death")]
    public string deathTrigger       = "die";
    [Tooltip("Seconds to wait after death before destroying the GameObject.")]
    public float despawnDelay        = 30f;
    [Tooltip("Length of the death animation clip. Animator is disabled after this so the pose freezes.")]
    public float deathAnimDuration   = 2.5f;

    // -----------------------------------------------------------------------
    // ScavengerRaidTask -- assigned at runtime, null outside that task
    // -----------------------------------------------------------------------
    [HideInInspector] public Transform scientistTarget;

    // -----------------------------------------------------------------------
    // Private state
    // -----------------------------------------------------------------------

    NavMeshAgent        agent;
    AIState             state                  = AIState.Patrol;

    Transform           currentTarget;
    bool                currentTargetIsScientist;
    Vector3             lastSeenTargetPos;
    Vector3             homePosition;

    float               stateTimer;
    float               attackTimer;
    bool                isAttacking;
    float               attackMoveLockTimer;

    bool                isDead;

    // -----------------------------------------------------------------------
    // Unity lifecycle
    // -----------------------------------------------------------------------

    void Start()
    {
        agent = GetComponent<NavMeshAgent>();

        if (animator == null) animator = GetComponentInChildren<Animator>();
        if (sensor    == null) sensor   = GetComponentInChildren<AlienSensor>();

        homePosition         = transform.position;
        agent.updateRotation = false;
        agent.speed          = patrolSpeed;

        state = AIState.Patrol;
        SetRandomPatrolDestination();
    }

    void Update()
    {
        if (isDead) return;

        if (!isAttacking)
        {
            Transform player = sensor != null ? sensor.GetClosestTarget("Player") : null;

            if (player != null)
            {
                currentTarget            = player;
                currentTargetIsScientist = false;
                lastSeenTargetPos        = player.position;
                SwitchToChase();
            }
            else if (scientistTarget != null && scientistTarget.gameObject.activeInHierarchy)
            {
                currentTarget            = scientistTarget;
                currentTargetIsScientist = true;
                lastSeenTargetPos        = scientistTarget.position;
                SwitchToChase();
            }
        }

        attackTimer -= Time.deltaTime;

        if (isAttacking)
        {
            attackMoveLockTimer -= Time.deltaTime;
            if (attackMoveLockTimer <= 0f)
                isAttacking = false;
        }

        switch (state)
        {
            case AIState.Patrol: UpdatePatrol(); break;
            case AIState.Idle:   UpdateIdle();   break;
            case AIState.Chase:  UpdateChase();  break;
            case AIState.Search: UpdateSearch(); break;
        }

        UpdateAnimation();
        HandleRotation();
    }

    // -----------------------------------------------------------------------
    // Patrol
    // -----------------------------------------------------------------------

    void UpdatePatrol()
    {
        if (isAttacking) return;

        if (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance + 0.1f)
        {
            state           = AIState.Idle;
            stateTimer      = idleTimeAtPoint;
            agent.isStopped = true;
        }
    }

    void SetRandomPatrolDestination()
    {
        if (isAttacking) return;

        Vector2 circle    = Random.insideUnitCircle * patrolRadius;
        Vector3 candidate = homePosition + new Vector3(circle.x, 0f, circle.y);

        if (NavMesh.SamplePosition(candidate, out NavMeshHit hit, 3f, NavMesh.AllAreas))
            agent.SetDestination(hit.position);
        else
            agent.SetDestination(candidate);

        agent.isStopped = false;
    }

    // -----------------------------------------------------------------------
    // Idle
    // -----------------------------------------------------------------------

    void UpdateIdle()
    {
        if (isAttacking) return;

        stateTimer -= Time.deltaTime;
        if (stateTimer <= 0f)
        {
            state       = AIState.Patrol;
            agent.speed = patrolSpeed;
            SetRandomPatrolDestination();
        }
    }

    // -----------------------------------------------------------------------
    // Chase + Attack
    // -----------------------------------------------------------------------

    void SwitchToChase()
    {
        if (state == AIState.Chase) return;
        state       = AIState.Chase;
        agent.speed = chaseSpeed;
        if (!isAttacking) agent.isStopped = false;
    }

    void UpdateChase()
    {
        if (isAttacking)
        {
            agent.isStopped = true;
            agent.velocity  = Vector3.zero;
            if (currentTarget != null) FaceTarget(currentTarget.position);
            return;
        }

        if (currentTarget != null)
        {
            float dist = Vector3.Distance(transform.position, currentTarget.position);

            if (dist > attackRange)
            {
                agent.isStopped = false;
                agent.SetDestination(currentTarget.position);
                lastSeenTargetPos = currentTarget.position;
            }
            else
            {
                agent.isStopped = true;
                FaceTarget(currentTarget.position);
                TryAttack();
            }
        }
        else
        {
            agent.isStopped = false;
            agent.SetDestination(lastSeenTargetPos);

            if (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance + 0.2f)
            {
                state      = AIState.Search;
                stateTimer = searchDuration;
            }
        }
    }

    void TryAttack()
    {
        if (attackTimer > 0f || animator == null || isAttacking) return;

        isAttacking         = true;
        agent.isStopped     = true;
        agent.velocity      = Vector3.zero;

        if (Random.Range(0, 2) == 0)
        {
            animator.SetTrigger(attack1Trigger);
            attackTimer         = attack1Cooldown;
            attackMoveLockTimer = attack1Duration;
        }
        else
        {
            animator.SetTrigger(attack2Trigger);
            attackTimer         = attack2Cooldown;
            attackMoveLockTimer = attack2Duration;
        }
    }

    /// <summary>
    /// Wire this to an Animation Event on the attack clips to apply damage.
    /// </summary>
    public void OnAttackHit()
    {
        if (currentTarget == null) return;

        if (currentTargetIsScientist)
            currentTarget.GetComponent<ScientistHealth>()?.TakeDamage(10f);
        else
            currentTarget.GetComponent<Health>()?.TakeDamage(10f);
    }

    // -----------------------------------------------------------------------
    // Search
    // -----------------------------------------------------------------------

    void UpdateSearch()
    {
        if (isAttacking) return;

        agent.SetDestination(lastSeenTargetPos);

        if (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance + 0.2f)
        {
            agent.isStopped = true;
            stateTimer -= Time.deltaTime;

            if (stateTimer <= 0f)
            {
                currentTarget            = null;
                currentTargetIsScientist = false;
                agent.isStopped          = false;
                state                    = AIState.Patrol;
                agent.speed              = patrolSpeed;
                SetRandomPatrolDestination();
            }
        }
    }

    // -----------------------------------------------------------------------
    // Rotation
    // -----------------------------------------------------------------------

    void HandleRotation()
    {
        // Only rotate while the agent is actually moving
        if (agent.velocity.sqrMagnitude > 0.1f && !isAttacking)
            FaceTarget(agent.velocity.normalized + transform.position);
    }

    void FaceTarget(Vector3 worldPosition)
    {
        Vector3 dir = worldPosition - transform.position;
        dir.y = 0f;
        if (dir.sqrMagnitude < 0.001f) return;

        transform.rotation = Quaternion.Slerp(
            transform.rotation,
            Quaternion.LookRotation(dir),
            Time.deltaTime * turnSpeed);
    }

    // -----------------------------------------------------------------------
    // Animation
    // -----------------------------------------------------------------------

    void UpdateAnimation()
    {
        if (animator == null) return;

        Vector3 worldVel = isAttacking ? Vector3.zero : agent.velocity;
        Vector3 localVel = transform.InverseTransformDirection(worldVel);
        float   maxSpeed = agent.speed > 0f ? agent.speed : 1f;

        animator.SetFloat(moveXParam, Mathf.Clamp(localVel.x / maxSpeed, -1f, 1f));
        animator.SetFloat(moveZParam, Mathf.Clamp(localVel.z / maxSpeed, -1f, 1f));
    }

    // -----------------------------------------------------------------------
    // Death
    // -----------------------------------------------------------------------

    public void Die()
    {
        if (isDead) return;
        isDead = true;

        StopAllCoroutines();

        state = AIState.Dead;

        // Hard-stop NavMeshAgent entirely
        if (agent != null)
        {
            agent.ResetPath();
            agent.isStopped = true;
            agent.velocity  = Vector3.zero;
            agent.enabled   = false;
        }

        // Freeze physics
        Rigidbody rb = GetComponent<Rigidbody>();
        if (rb != null)
        {
            rb.velocity        = Vector3.zero;
            rb.angularVelocity = Vector3.zero;
            rb.isKinematic     = true;
        }

        if (sensor != null) sensor.enabled = false;

        SimpleEnemyDamage dmg = GetComponent<SimpleEnemyDamage>();
        if (dmg != null) dmg.enabled = false;

        foreach (Collider col in GetComponentsInChildren<Collider>())
            col.enabled = false;

        // Play death animation.
        // Must trigger BEFORE disabling this component — StartCoroutine
        // requires the MonoBehaviour to be enabled. Coroutines continue
        // running on a disabled component as long as the GameObject is active.
        if (animator != null)
        {
            foreach (var param in animator.parameters)
                if (param.type == AnimatorControllerParameterType.Trigger)
                    animator.ResetTrigger(param.name);

            animator.SetTrigger(deathTrigger);
        }

        // Start despawn coroutine BEFORE disabling this component
        StartCoroutine(DespawnAfterDeathAnim());

        // Notify ScavengerRaidTask
        GetComponent<AlienDeathNotifier>()?.Die();

        // Disable Update() — coroutines keep running while GameObject is active
        enabled = false;
    }

    // Destroys the GameObject as soon as the death animation finishes.
    IEnumerator DespawnAfterDeathAnim()
    {
        yield return new WaitForSeconds(deathAnimDuration);
        if (animator != null)
            animator.enabled = false;
        Destroy(gameObject);
    }
}