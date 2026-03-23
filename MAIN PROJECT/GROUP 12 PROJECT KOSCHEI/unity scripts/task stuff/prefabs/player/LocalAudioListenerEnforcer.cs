using Unity.Netcode;
using UnityEngine;

[RequireComponent(typeof(AudioListener))]
public class LocalAudioListenerEnforcer : NetworkBehaviour
{
    private AudioListener _listener;

    void Awake()
    {
        _listener = GetComponent<AudioListener>();
    }

    public override void OnNetworkSpawn()
    {
        // This script is on the *child* camera, but ownership is on the parent NetworkObject.
        // NetworkBehaviour will route IsOwner correctly as long as the parent has NetworkObject.
        if (!IsOwner)
        {
            if (_listener != null)
                _listener.enabled = false;
            return;
        }

        // Local player: enable this listener, disable all others on THIS client
        if (_listener != null)
            _listener.enabled = true;

        var all = FindObjectsOfType<AudioListener>(true);
        foreach (var l in all)
        {
            if (l != _listener)
                l.enabled = false;
        }
    }
}
