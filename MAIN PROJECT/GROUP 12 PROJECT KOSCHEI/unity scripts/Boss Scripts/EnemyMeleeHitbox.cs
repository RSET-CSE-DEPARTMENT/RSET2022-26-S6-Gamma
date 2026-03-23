using UnityEngine;
using System.Collections.Generic;

public class EnemyMeleeHitbox : MonoBehaviour
{
    [Header("Hitbox Settings")]
    public float damage = 25f;

    [Tooltip("Assign ONLY claw & spike colliders here")]
    public Collider[] hitColliders;

    HashSet<Health> damagedTargets = new HashSet<Health>();
    bool attackActive = false;

    void Awake()
    {
        // Disable assigned hit colliders at start
        foreach (Collider col in hitColliders)
        {
            if (col != null)
                col.enabled = false;
        }
    }

    // Call via Animation Event (start of impact frames)
    public void EnableHitboxes()
    {
        damagedTargets.Clear();
        attackActive = true;

        foreach (Collider col in hitColliders)
        {
            if (col != null)
                col.enabled = true;
        }
    }

    // Call via Animation Event (end of impact frames)
    public void DisableHitboxes()
    {
        attackActive = false;

        foreach (Collider col in hitColliders)
        {
            if (col != null)
                col.enabled = false;
        }
    }

    void OnTriggerEnter(Collider other)
    {
        if (!attackActive)
            return;

        Health health = other.GetComponent<Health>();
        if (health == null)
            return;

        if (damagedTargets.Contains(health))
            return;

        health.TakeDamage(damage);
        damagedTargets.Add(health);
    }
}
