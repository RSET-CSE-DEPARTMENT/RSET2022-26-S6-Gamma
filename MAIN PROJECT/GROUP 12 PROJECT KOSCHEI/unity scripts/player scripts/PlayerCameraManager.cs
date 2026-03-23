using UnityEngine;
using Unity.Netcode;
using Cinemachine;

/// <summary>
/// Ensures only the local player's camera is active in multiplayer
/// Attach this to your player prefab
/// </summary>
public class PlayerCameraManager : NetworkBehaviour
{
    [Header("Camera References")]
    [SerializeField] private CinemachineVirtualCamera thirdPersonCamera;
    [SerializeField] private CinemachineVirtualCamera aimCamera;
    [SerializeField] private GameObject cinemachineCameraTarget;
    
    [Header("Audio Listener")]
    [SerializeField] private AudioListener audioListener;

    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();

        if (!IsOwner)
        {
            // Disable cameras for non-owned players
            if (thirdPersonCamera != null)
                thirdPersonCamera.gameObject.SetActive(false);
            
            if (aimCamera != null)
                aimCamera.gameObject.SetActive(false);
            
            if (cinemachineCameraTarget != null)
                cinemachineCameraTarget.SetActive(false);

            // Disable audio listener to prevent multiple listeners warning
            if (audioListener != null)
                audioListener.enabled = false;
        }
        else
        {
            // Enable cameras for owned player
            if (thirdPersonCamera != null)
                thirdPersonCamera.gameObject.SetActive(true);
            
            // Note: aimCamera should stay off until player aims
            // That's handled by ThirdPersonShooterController
            
            if (cinemachineCameraTarget != null)
                cinemachineCameraTarget.SetActive(true);

            // Ensure audio listener is enabled for local player
            if (audioListener != null)
                audioListener.enabled = true;
            
            Debug.Log($"[PlayerCameraManager] Local player spawned - Camera enabled");
        }
    }
}
