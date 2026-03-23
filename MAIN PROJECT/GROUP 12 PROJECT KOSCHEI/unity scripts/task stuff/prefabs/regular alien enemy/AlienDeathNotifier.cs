using System;
using UnityEngine;

public class AlienDeathNotifier : MonoBehaviour
{
    public event Action OnDied;
    bool notified = false;

    /// <summary>
    /// Called by AlienMovement.Die() when the alien is killed.
    /// Fires the OnDied event so ScavengerRaidTask can track kill count.
    /// Does NOT destroy the GameObject -- AlienMovement.Die() schedules
    /// Destroy(gameObject, 30f) so the corpse stays for the animation.
    /// </summary>
    public void Die()
    {
        if (notified) return;
        notified = true;
        OnDied?.Invoke();
    }

    // Safety net: if the object is destroyed by some other path, still fire the event
    void OnDestroy()
    {
        if (!notified)
        {
            notified = true;
            OnDied?.Invoke();
        }
    }
}