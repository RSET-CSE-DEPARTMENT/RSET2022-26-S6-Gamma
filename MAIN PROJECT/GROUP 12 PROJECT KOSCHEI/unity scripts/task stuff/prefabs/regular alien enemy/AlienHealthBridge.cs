using UnityEngine;

/// <summary>
/// Bridges Health -> AlienMovement.Die().
///
/// Health.cs manages HP and syncs isDead across the network, but its
/// HandleDeathOnClient() only does generic AI cleanup -- it does not call
/// AlienMovement.Die(), so the death animation and ScavengerRaidTask
/// notification never fire when damage comes through Health.
///
/// This component watches Health.IsDead() each frame and calls
/// AlienMovement.Die() the moment death is confirmed on any client.
/// AlienMovement.Die() plays the animation and destroys the object
/// exactly when the clip finishes.
///
/// Setup: add this to the scavenger prefab alongside Health + AlienMovement.
/// No changes to Health.cs needed.
/// </summary>
[RequireComponent(typeof(Health))]
[RequireComponent(typeof(AlienMovement))]
public class AlienHealthBridge : MonoBehaviour
{
    Health        health;
    AlienMovement movement;
    bool          deathHandled = false;

    void Awake()
    {
        health   = GetComponent<Health>();
        movement = GetComponent<AlienMovement>();
    }

    void Update()
    {
        if (deathHandled) return;
        if (health == null || movement == null) return;

        if (health.IsDead())
        {
            deathHandled = true;
            movement.Die();
        }
    }
}
