using System.Collections;
using UnityEngine;
using StarterAssets;
using Unity.Netcode;

public class PlayerHealthHandler : NetworkBehaviour
{
    [Header("References")]
    [SerializeField] private Health healthComponent;

    [Header("Animation Settings")]
    [SerializeField] private string hitTriggerName = "takehit";
    [SerializeField] private string dieTriggerName = "die";

    [Header("Debug Testing")]
    [SerializeField] private bool enableDebugDamage = true;
    [SerializeField] private KeyCode debugDamageKey = KeyCode.T;
    [SerializeField] private float debugDamageAmount = 20f;
    [SerializeField] private KeyCode debugKillKey = KeyCode.K;

    private Animator animator;
    private ThirdPersonController thirdPersonController;
    private ThirdPersonShooterController shooterController;
    private CharacterController characterController;
    private StarterAssetsInputs starterAssetsInputs;

    private float lastHealth;
    private bool hasHandledDeath = false;

    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();

        // Auto-find Health component if not assigned
        if (healthComponent == null)
            healthComponent = GetComponent<Health>();

        // Get player components
        animator = GetComponent<Animator>();
        thirdPersonController = GetComponent<ThirdPersonController>();
        shooterController = GetComponent<ThirdPersonShooterController>();
        characterController = GetComponent<CharacterController>();
        starterAssetsInputs = GetComponent<StarterAssetsInputs>();

        // Initialize health tracking
        if (healthComponent != null)
            lastHealth = healthComponent.GetCurrentHealth();

        Debug.Log($"[PlayerHealthHandler] Spawned - IsOwner: {IsOwner}, Health: {(healthComponent != null ? "Found" : "NULL")}");
    }

    private void Update()
    {
        if (healthComponent == null) return;

        // DEBUG: Test damage (only for owner)
        if (IsOwner && enableDebugDamage && !healthComponent.IsDead())
        {
            if (Input.GetKeyDown(debugDamageKey))
            {
                Debug.Log($"[DEBUG] Requesting {debugDamageAmount} damage to player");
                RequestDamageServerRpc(debugDamageAmount);
            }

            if (Input.GetKeyDown(debugKillKey))
            {
                Debug.Log($"[DEBUG] Requesting instant kill");
                RequestDamageServerRpc(999f);
            }

            // Debug state check
            if (Input.GetKeyDown(KeyCode.H))
            {
                Debug.Log($"[DEBUG] Health: {healthComponent.GetCurrentHealth()}, " +
                          $"IsDead: {healthComponent.IsDead()}, " +
                          $"HasHandledDeath: {hasHandledDeath}, " +
                          $"Layer1: {(animator != null ? animator.GetLayerWeight(1) : -1)}, " +
                          $"Layer2: {(animator != null ? animator.GetLayerWeight(2) : -1)}");
            }
        }

        // Check if player is dead (synced across network)
        if (healthComponent.IsDead() && !hasHandledDeath)
        {
            OnPlayerDeath();
            return;
        }

        // Block all gameplay inputs if dead (only for owner)
        if (IsOwner && healthComponent.IsDead())
        {
            BlockAllInputs();
        }

        // Continuously force layer weights to 0 if dead
        if (healthComponent.IsDead() && animator != null)
        {
            animator.SetLayerWeight(1, 0f);
            animator.SetLayerWeight(2, 0f);
        }

        // Only track health changes for owner
        if (IsOwner && !healthComponent.IsDead())
        {
            float currentHealth = healthComponent.GetCurrentHealth();

            // Check if health decreased (player took damage)
            if (currentHealth < lastHealth && currentHealth > 0)
            {
                OnPlayerTookDamage(lastHealth - currentHealth);
            }

            lastHealth = currentHealth;
        }
    }

    [ServerRpc]
    private void RequestDamageServerRpc(float damage)
    {
        if (healthComponent != null)
        {
            healthComponent.TakeDamage(damage);
        }
    }

    private void OnPlayerTookDamage(float damageAmount)
    {
        Debug.Log($"[PlayerHealthHandler] Player took {damageAmount} damage! Current HP: {healthComponent.GetCurrentHealth()}");

        // Play hit animation - sync to all clients
        if (animator != null)
        {
            PlayHitAnimationClientRpc();
        }
    }

    [ClientRpc]
    private void PlayHitAnimationClientRpc()
    {
        if (animator != null)
        {
            animator.SetTrigger(hitTriggerName);
        }
    }

    private void OnPlayerDeath()
    {
        hasHandledDeath = true;
        Debug.Log($"[PlayerHealthHandler] Player died! IsOwner: {IsOwner}");

        // Disable controllers FIRST to prevent movement warnings
        if (IsOwner)
        {
            // Disable the scripts that control movement
            if (thirdPersonController != null)
            {
                thirdPersonController.enabled = false;
                Debug.Log("[PlayerHealthHandler] ThirdPersonController disabled");
            }

            if (shooterController != null)
            {
                shooterController.enabled = false;
                Debug.Log("[PlayerHealthHandler] ShooterController disabled");
            }

            // Block all inputs
            BlockAllInputs();
        }

        // Play death animation on ALL clients
        PlayDeathAnimationClientRpc();

        // Disable colliders after animation starts
        StartCoroutine(DisableCollidersDelayed(0.5f));
    }

    [ClientRpc]
    private void PlayDeathAnimationClientRpc()
    {
        Debug.Log($"[PlayerHealthHandler] Playing death animation on client");

        if (animator != null)
        {
            // IMMEDIATELY reset animation layers (not lerp)
            animator.SetLayerWeight(1, 0f); // Disable aiming layer
            animator.SetLayerWeight(2, 0f); // Disable gun stance layer

            Debug.Log($"[PlayerHealthHandler] Animation layers reset - Layer1: {animator.GetLayerWeight(1)}, Layer2: {animator.GetLayerWeight(2)}");

            // Trigger death animation
            animator.SetTrigger(dieTriggerName);
            Debug.Log($"[PlayerHealthHandler] Death animation triggered: {dieTriggerName}");
        }
    }

    private void BlockAllInputs()
    {
        if (starterAssetsInputs == null) return;

        // Block all movement and action inputs
        starterAssetsInputs.move = Vector2.zero;
        starterAssetsInputs.look = Vector2.zero;
        starterAssetsInputs.jump = false;
        starterAssetsInputs.sprint = false;
        starterAssetsInputs.aim = false;
        starterAssetsInputs.shoot = false;
        starterAssetsInputs.reload = false;
        starterAssetsInputs.interact = false;
        starterAssetsInputs.drop = false;
    }

    private IEnumerator DisableCollidersDelayed(float delay)
    {
        yield return new WaitForSeconds(delay);

        // Disable colliders so other players can walk through the corpse
        Collider[] colliders = GetComponentsInChildren<Collider>();
        foreach (Collider col in colliders)
        {
            col.enabled = false;
        }

        Debug.Log("[PlayerHealthHandler] Colliders disabled - players can walk through corpse");
    }

    // Public methods
    public bool IsDead() => healthComponent != null && healthComponent.IsDead();

    public float GetCurrentHealth()
    {
        return healthComponent != null ? healthComponent.GetCurrentHealth() : 0;
    }
}
