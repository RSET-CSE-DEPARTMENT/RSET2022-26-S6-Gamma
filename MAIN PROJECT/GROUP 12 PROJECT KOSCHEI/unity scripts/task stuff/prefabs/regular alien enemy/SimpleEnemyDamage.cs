using UnityEngine;
using System.Collections;

public class SimpleEnemyDamage : MonoBehaviour
{
    [Header("Target")]
    public string targetTag = "Player";

    [Header("Damage")]
    public float damage = 10f;
    public float attackRange = 2f;
    public float attackCooldown = 2f;
    public float attackDuration = 0.8f;

    [Header("Hitboxes")]
    public Collider[] damageColliders;

    private bool isAttacking;
    private bool hasDealtDamage;
    private float lastAttackTime;

    void Update()
    {
        if (!Unity.Netcode.NetworkManager.Singleton.IsServer)
            return;

        if (Time.time >= lastAttackTime + attackCooldown)
        {
            TryAutoAttack();
        }
    }

    void TryAutoAttack()
    {
        GameObject player = GameObject.FindGameObjectWithTag(targetTag);
        if (player == null)
            return;

        float distance = Vector3.Distance(transform.position, player.transform.position);

        if (distance <= attackRange)
        {
            StartCoroutine(PerformAttack());
        }
    }

    IEnumerator PerformAttack()
    {
        isAttacking = true;
        hasDealtDamage = false;
        lastAttackTime = Time.time;

        float timer = 0f;

        while (timer < attackDuration)
        {
            timer += Time.deltaTime;

            TryDealDamage();

            yield return null;
        }

        isAttacking = false;
    }

    void TryDealDamage()
    {
        if (hasDealtDamage)
            return;

        if (damageColliders == null || damageColliders.Length == 0)
            return;

        foreach (Collider col in damageColliders)
        {
            if (col == null)
                continue;

            Collider[] overlaps = Physics.OverlapBox(
                col.bounds.center,
                col.bounds.extents,
                col.transform.rotation
            );

            foreach (Collider hit in overlaps)
            {
                Transform root = hit.transform.root;

                if (!root.CompareTag(targetTag))
                    continue;

                Health health = root.GetComponent<Health>();
                if (health == null)
                    continue;

                health.TakeDamage(damage);

                hasDealtDamage = true;
                Debug.Log($"{name} dealt {damage} damage to {root.name}");
                return;
            }
        }
    }
}