using Unity.Collections;
using Unity.Netcode;
using UnityEngine;

public class PlayerIdentity : NetworkBehaviour
{
    public static PlayerIdentity Local;

    [SerializeField] private string defaultBaseName = "Player";

    // Networked so every client sees the correct display name
    public NetworkVariable<FixedString64Bytes> playerName =
        new NetworkVariable<FixedString64Bytes>(
            default,
            NetworkVariableReadPermission.Everyone,
            NetworkVariableWritePermission.Server);

    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();

        if (IsOwner)
        {
            Local = this;

            // Pull the name the player typed at the login screen.
            // LobbyManager.PlayerName is set by AuthenticateUI before any
            // scene loads, so it is always available here.
            string name = defaultBaseName;
            if (Koshcei.LobbyManager.Instance != null &&
                !string.IsNullOrEmpty(Koshcei.LobbyManager.Instance.PlayerName))
            {
                name = Koshcei.LobbyManager.Instance.PlayerName;
            }

            // Send the name to the server so it can write the NetworkVariable.
            // Server writes propagate to all clients automatically.
            SubmitNameServerRpc(name);
            Debug.Log($"[PlayerIdentity] Submitted name: {name}");
        }
    }

    // -----------------------------------------------------------------------
    // Only the server may write the NetworkVariable, so the client asks it to.
    // RequireOwnership = false is needed because the host's SpawnAsPlayerObject
    // assigns ownership before this RPC fires, but the check still needs to
    // allow non-host owners to call it.
    // -----------------------------------------------------------------------
    [ServerRpc(RequireOwnership = false)]
    private void SubmitNameServerRpc(string name, ServerRpcParams rpc = default)
    {
        // Sanitize: strip leading/trailing whitespace, cap length
        name = name.Trim();
        if (name.Length > 32) name = name.Substring(0, 32);
        if (string.IsNullOrEmpty(name)) name = $"{defaultBaseName} {OwnerClientId + 1}";

        playerName.Value = new FixedString64Bytes(name);
        Debug.Log($"[PlayerIdentity] Server set name for client {OwnerClientId}: {name}");
    }

    // -----------------------------------------------------------------------
    public string GetDisplayName()
    {
        if (playerName.Value.IsEmpty)
            return $"{defaultBaseName} {OwnerClientId + 1}";

        return playerName.Value.ToString();
    }
}