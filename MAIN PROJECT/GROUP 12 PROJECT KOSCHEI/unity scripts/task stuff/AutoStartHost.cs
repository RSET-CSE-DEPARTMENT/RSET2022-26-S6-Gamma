using Unity.Netcode;
using UnityEngine;

public class AutoStartHost : MonoBehaviour
{
    void Start()
    {
#if UNITY_EDITOR
        // Only auto-start in Unity Editor (for testing)
        if (NetworkManager.Singleton != null)
        {
            NetworkManager.Singleton.StartHost();
            Debug.Log("Auto-started as Host (Editor only)");
        }
#endif
    }
}
