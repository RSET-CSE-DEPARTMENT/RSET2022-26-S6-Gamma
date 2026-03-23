using Unity.Netcode;
using Unity.Netcode.Transports.UTP;
using UnityEngine;

public static class NetworkHostAddressHelper
{
    /// <summary>
    /// Returns "http://<hostAddress>:8000/chat" based on UnityTransport,
    /// or null if it can't be determined.
    /// </summary>
    public static string GetChatApiUrlFromNetworkManager(int port = 8000, string path = "/chat")
    {
        if (NetworkManager.Singleton == null)
            return null;

        var transport = NetworkManager.Singleton.NetworkConfig.NetworkTransport as UnityTransport;
        if (transport == null)
            return null;

        // For host: this is usually the listen address (e.g. 0.0.0.0 or a specific IP).
        // For clients: this is the remote address they connect to (the host's IP/hostname).
        string hostAddress = transport.ConnectionData.Address;
        if (string.IsNullOrEmpty(hostAddress))
            return null;

        return $"http://{hostAddress}:{port}{path}";
    }
}
