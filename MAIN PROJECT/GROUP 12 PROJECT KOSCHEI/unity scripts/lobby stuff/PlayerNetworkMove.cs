using Unity.Netcode;
using UnityEngine;

public class PlayerNetworkMove : NetworkBehaviour
{
    [Header("Settings")]
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private float rotateSpeed = 3f;

    [Header("References")]
    [SerializeField] private Transform cameraRoot; // Drag the "CameraRoot" object here

    public override void OnNetworkSpawn()
    {
        // If this is NOT my player, don't steal the camera!
        if (!IsOwner) return;

        // If this IS my player, attach the Main Camera to my head
        if (Camera.main != null)
        {
            Camera.main.transform.SetParent(cameraRoot);
            Camera.main.transform.localPosition = Vector3.zero;
            Camera.main.transform.localRotation = Quaternion.identity;
        }
    }

    private void Update()
    {
        // Only run movement logic if this is MY player
        if (!IsOwner) return;

        HandleMovement();
        HandleRotation();
    }

    private void HandleMovement()
    {
        float moveX = Input.GetAxis("Horizontal");
        float moveZ = Input.GetAxis("Vertical");

        Vector3 move = transform.right * moveX + transform.forward * moveZ;

        // Simple Gravity (Optional: prevents floating if you walk off a ledge)
        move.y = -9.8f * Time.deltaTime;

        // Use CharacterController if you have one, otherwise Transform
        transform.position += move * moveSpeed * Time.deltaTime;
    }

    private void HandleRotation()
    {
        float mouseX = Input.GetAxis("Mouse X") * rotateSpeed;
        transform.Rotate(Vector3.up * mouseX);
    }
}