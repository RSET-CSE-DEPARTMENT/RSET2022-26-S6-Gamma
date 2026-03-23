using UnityEngine;

/// <summary>
/// Receives OnFootstep and OnLand animation events on the ImpostorPlayer prefab,
/// matching the same behaviour as ThirdPersonController on the real player.
/// Add to the root of ImpostorPlayer and assign the same audio clips.
/// </summary>
public class FootstepReceiver : MonoBehaviour
{
    [Header("Audio Clips")]
    public AudioClip LandingAudioClip;
    public AudioClip[] FootstepAudioClips;

    [Range(0f, 1f)]
    public float FootstepAudioVolume = 0.5f;

    // Called by animation events on Walk_N and Run_N clips
    private void OnFootstep(AnimationEvent animationEvent)
    {
        // Respect blend weight so blended transitions don't double-trigger
        if (animationEvent.animatorClipInfo.weight <= 0.5f) return;
        if (FootstepAudioClips == null || FootstepAudioClips.Length == 0) return;

        var index = Random.Range(0, FootstepAudioClips.Length);
        AudioSource.PlayClipAtPoint(FootstepAudioClips[index],
            transform.position, FootstepAudioVolume);
    }

    // Called by animation events on Walk_N_Land and Run_N_Land clips
    private void OnLand(AnimationEvent animationEvent)
    {
        if (LandingAudioClip == null) return;

        AudioSource.PlayClipAtPoint(LandingAudioClip,
            transform.position, FootstepAudioVolume);
    }
}