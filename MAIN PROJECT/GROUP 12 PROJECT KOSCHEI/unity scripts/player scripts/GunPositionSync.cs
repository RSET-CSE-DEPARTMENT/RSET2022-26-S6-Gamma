using Unity.Netcode;
using UnityEngine;

public class GunPositionSync : NetworkBehaviour
{
    [Header("Gun Setup")]
    [SerializeField] private Transform gunPoint;     // GunPoint transform
    [SerializeField] private Transform gunObject;    // The gun child

    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();

        // FORCE correct position/rotation for ALL players
        SnapGunToPosition();
    }

    private void LateUpdate()
    {
        // Continuously enforce position (runs every frame)
        if (gunObject != null && gunPoint != null)
        {
            SnapGunToPosition();
        }
    }

    private void SnapGunToPosition()
    {
        gunObject.SetParent(gunPoint);
        gunObject.localPosition = Vector3.zero;
        gunObject.localRotation = Quaternion.identity;
        gunObject.localScale = Vector3.one;
    }
}
