using UnityEngine;
using UnityEngine.AI;
using Unity.Netcode;

public class Health : NetworkBehaviour
{
    [Header("Stats")]
    [SerializeField] private float maxHealth = 100f;
    [SerializeField] private float defence = 15f;
    [SerializeField] private float destroyAfterSeconds = 0f; // 0 = don't destroy

    [Header("UI")]
    [SerializeField] private HealthBar healthBar;

    [Header("Debug")]
    [SerializeField] private bool enableDebugDamage = false;
    [SerializeField] private float debugDamageAmount = 25f;
    [SerializeField] private KeyCode debugDamageKey = KeyCode.K;
    
    private NetworkVariable<float> currentHealth = new NetworkVariable<float>(
        100f,
        NetworkVariableReadPermission.Everyone,
        NetworkVariableWritePermission.Server
    );

    private NetworkVariable<bool> isDead = new NetworkVariable<bool>(
        false,
        NetworkVariableReadPermission.Everyone,
        NetworkVariableWritePermission.Server
    );

    // =========================
    // UNITY EVENTS
    // =========================

    private void Update()
    {
        if (!enableDebugDamage) 
        {
            return;
        }
        
        if (Input.GetKeyDown(debugDamageKey))
        {
            if (IsServer)
            {
                Debug.Log($"[DEBUG] Applying {debugDamageAmount} damage to {gameObject.name}");
                TakeDamage(debugDamageAmount);
            }
        }
    }



    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();

        if (IsServer)
        {
            currentHealth.Value = maxHealth;
            isDead.Value = false;
        }

        // Subscribe to death state changes for all clients
        currentHealth.OnValueChanged += OnHealthChanged;
        isDead.OnValueChanged += OnDeathStateChanged;

        // Initialize UI
        if (healthBar != null)
        {
            healthBar.SetMaxHealth(maxHealth);
            healthBar.SetHealth(currentHealth.Value);
        }

        Debug.Log($"[Health] {gameObject.name} spawned - Health: {currentHealth.Value}, IsServer: {IsServer}");
    }

    public override void OnNetworkDespawn()
    {
        base.OnNetworkDespawn();
        currentHealth.OnValueChanged -= OnHealthChanged;
        isDead.OnValueChanged -= OnDeathStateChanged;
    }

    private void OnDeathStateChanged(bool previousValue, bool newValue)
    {
        if (newValue && !previousValue)
        {
            // Death just occurred, handle it on all clients
            Debug.Log($"[Health] {gameObject.name} death state changed on client");
            HandleDeathOnClient();
        }
    }

    // =========================
    // DAMAGE
    // =========================

    public void TakeDamage(float damage)
    {
        // Only server can modify health
        if (!IsServer)
        {
            Debug.LogWarning($"[Health] TakeDamage called on client - ignored");
            return;
        }

        if (isDead.Value) 
        {
            return;
        }

        if (damage > 0)
        {
            damage = Mathf.Max(damage - defence, 0f);
            currentHealth.Value -= damage;
        }
        else
        {
            // Healing (negative damage)
            currentHealth.Value -= damage;
        }

        Debug.Log($"[Health] {gameObject.name} took {damage} damage. Remaining HP: {currentHealth.Value}");

        if (currentHealth.Value <= 0f)
        {
            currentHealth.Value = 0f;
            Die();
        }
    }

    private void OnHealthChanged(float oldValue, float newValue)
    {
        Debug.Log($"[Health] {gameObject.name} health changed: {newValue}");

        if (healthBar != null)
        {
            healthBar.SetHealth(newValue);
        }

        
        HealthMaterialChanger changer = GetComponent<HealthMaterialChanger>();
        if (changer != null)
        {
            changer.UpdateMaterial();
        }   
        
    }

    public float GetCurrentHealth()
    {
        return currentHealth.Value;
    }

    public float GetMaxHealth()
    {
        return maxHealth;
    }

    public float GetHealthPercent()
    {
        if (maxHealth <= 0f) return 0f;
        return currentHealth.Value / maxHealth;
    }

    public bool IsDead()
    {
        return isDead.Value;
    }

    private void Die()
    {
        // Only server can trigger death
        if (!IsServer) return;
        if (isDead.Value) return;

        isDead.Value = true;

        Debug.Log($"[Health] {gameObject.name} died on server!");

        // The actual death handling will be done in OnDeathStateChanged
        // which triggers on all clients including server
    }

    private void HandleDeathOnClient()
    {
        Debug.Log($"[Health] {gameObject.name} handling death on client");

        // Check if this is a PLAYER (has PlayerHealthHandler)
        PlayerHealthHandler playerHandler = GetComponent<PlayerHealthHandler>();
        if (playerHandler != null)
        {
            // Let PlayerHealthHandler handle player death completely
            Debug.Log("[Health] Player detected - delegating death handling to PlayerHealthHandler");
            return;
        }

        // Below code only runs for AI/NPCs, NOT players

        // 1️⃣ Stop NavMeshAgent (if exists)
        NavMeshAgent agent;
        if (TryGetComponent(out agent))
        {
            agent.isStopped = true;
            agent.enabled = false;
        }

        // 2️⃣ Disable AILocomotion (if exists)
        AILocomotion ai;
        if (TryGetComponent(out ai))
        {
            ai.enabled = false;
        }

        // 3️⃣ Stop Rigidbody (if exists)
        Rigidbody rb;
        if (TryGetComponent(out rb))
        {
            rb.velocity = Vector3.zero;
            rb.angularVelocity = Vector3.zero;
            rb.isKinematic = true;
        }

        // 4️⃣ Disable ALL Colliders (safe for AI & non-AI)
        Collider[] colliders = GetComponentsInChildren<Collider>();
        foreach (Collider col in colliders)
        {
            col.enabled = false;
        }

        // 5️⃣ Trigger death animation safely
        Animator animator;
        if (TryGetComponent(out animator))
        {
            bool hasDieTrigger = false;
            foreach (var param in animator.parameters)
            {
                if (param.type == AnimatorControllerParameterType.Trigger &&
                    param.name == "die")
                {
                    hasDieTrigger = true;
                    break;
                }
            }

            if (hasDieTrigger)
            {
                animator.SetTrigger("die");
            }
        }

        // 6️⃣ Optional destroy (only on server)
        if (IsServer && destroyAfterSeconds > 0f)
        {
            Destroy(gameObject, destroyAfterSeconds);
        }
    }
}
