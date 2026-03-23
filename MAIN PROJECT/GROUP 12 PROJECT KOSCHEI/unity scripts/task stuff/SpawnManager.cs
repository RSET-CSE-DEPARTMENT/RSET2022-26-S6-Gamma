using System.Collections;
using System.Collections.Generic;
using Unity.Netcode;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Koshcei
{
    public class SpawnManager : MonoBehaviour
    {
        // -----------------------------------------------------------------------
        // Inspector
        // -----------------------------------------------------------------------
        [Header("Player Prefab")]
        [Tooltip("Must also be registered in NetworkManager's NetworkPrefabs list.")]
        [SerializeField] private NetworkObject playerPrefab;

        [Header("Spawn Positions")]
        public List<Vector3> spawnPositions = new List<Vector3>()
        {
            new Vector3(550, 20, 475),
            new Vector3(560, 20, 475),
            new Vector3(540, 20, 475),
            new Vector3(530, 20, 475)
        };

        // -----------------------------------------------------------------------
        // Private
        // -----------------------------------------------------------------------
        private int nextSpawnIndex = 0;
        private readonly HashSet<ulong> spawnedClients = new HashSet<ulong>();

        // -----------------------------------------------------------------------
        // Awake – server only
        // -----------------------------------------------------------------------
        private void Awake()
        {
            if (NetworkManager.Singleton == null)
            {
                Debug.LogError("[SpawnManager] NetworkManager.Singleton is null!");
                return;
            }

            if (!NetworkManager.Singleton.IsServer) return;

            // Never auto-spawn at approval — we control all spawning below
            NetworkManager.Singleton.ConnectionApprovalCallback = (request, response) =>
            {
                response.Approved = true;
                response.CreatePlayerObject = false;
                response.Pending = false;
                Debug.Log($"[SpawnManager] Client {request.ClientNetworkId} approved.");
            };

            // ---------------------------------------------------------------
            // SPAWN STRATEGY
            //
            // There are two connection timings to handle:
            //
            // CASE 1 — Client was connected BEFORE or DURING host's LoadScene call
            //   NGO sends the client a LoadScene message. OnLoadEventCompleted fires
            //   on the server once all such clients confirm they finished loading.
            //   We spawn everyone listed in clientsCompleted here.
            //
            // CASE 2 — Client connects AFTER the host already finished loading Scene_A
            //   (the common lobby case — relay code takes 1.5s+ poll to reach client)
            //   NGO sends a full-state Synchronize message instead of LoadScene.
            //   OnLoadEventCompleted never fires for this client.
            //   OnClientConnectedCallback IS reliable here because NGO only fires it
            //   after the client has been added to ConnectedClients, which only happens
            //   after full scene synchronization is complete on that client.
            //   We spawn the late joiner in a coroutine from this callback.
            // ---------------------------------------------------------------
            NetworkManager.Singleton.SceneManager.OnLoadEventCompleted += OnSceneLoadComplete;
            NetworkManager.Singleton.OnClientConnectedCallback += OnClientConnected;

            Debug.Log("[SpawnManager] Server hooks registered.");
        }

        // -----------------------------------------------------------------------
        private void OnDestroy()
        {
            if (NetworkManager.Singleton == null) return;

            NetworkManager.Singleton.ConnectionApprovalCallback = null;

            if (NetworkManager.Singleton.SceneManager != null)
                NetworkManager.Singleton.SceneManager.OnLoadEventCompleted -= OnSceneLoadComplete;

            NetworkManager.Singleton.OnClientConnectedCallback -= OnClientConnected;
        }

        // -----------------------------------------------------------------------
        // CASE 1 — fires on server after all LoadScene recipients have loaded
        // -----------------------------------------------------------------------
        private void OnSceneLoadComplete(
            string sceneName,
            LoadSceneMode loadSceneMode,
            List<ulong> clientsCompleted,
            List<ulong> clientsTimedOut)
        {
            if (sceneName != "Scene_A") return;

            if (clientsTimedOut.Count > 0)
                Debug.LogWarning($"[SpawnManager] {clientsTimedOut.Count} client(s) timed out on scene load.");

            Debug.Log($"[SpawnManager] OnLoadEventCompleted – {clientsCompleted.Count} client(s): [{string.Join(", ", clientsCompleted)}]");

            foreach (ulong clientId in clientsCompleted)
                TrySpawnPlayer(clientId);
        }

        // -----------------------------------------------------------------------
        // CASE 2 — fires on server when any client finishes full connection+sync.
        // NGO only adds a client to ConnectedClients (and fires this callback) after
        // scene synchronization is complete, so it is safe to spawn immediately.
        //
        // We still guard with a one-frame coroutine to let NGO finish any final
        // internal state updates before we call SpawnAsPlayerObject.
        // -----------------------------------------------------------------------
        private void OnClientConnected(ulong clientId)
        {
            // If OnLoadEventCompleted already handled this client, skip
            if (spawnedClients.Contains(clientId))
            {
                Debug.Log($"[SpawnManager] OnClientConnected: client {clientId} already spawned via LoadEvent – skipping.");
                return;
            }

            // Only spawn if we're in the game scene
            if (SceneManager.GetActiveScene().name != "Scene_A")
            {
                Debug.Log($"[SpawnManager] OnClientConnected: client {clientId} connected but not in game scene yet – skipping.");
                return;
            }

            Debug.Log($"[SpawnManager] OnClientConnected: late-joining client {clientId} – spawning via coroutine.");
            StartCoroutine(SpawnAfterOneFrame(clientId));
        }

        private IEnumerator SpawnAfterOneFrame(ulong clientId)
        {
            // One frame lets NGO finalize any internal synchronization bookkeeping
            yield return null;

            // Double-check the client is still connected (they might have disconnected)
            if (!NetworkManager.Singleton.ConnectedClients.ContainsKey(clientId))
            {
                Debug.LogWarning($"[SpawnManager] Client {clientId} disconnected before spawn coroutine ran.");
                yield break;
            }

            TrySpawnPlayer(clientId);
        }

        // -----------------------------------------------------------------------
        // Guard + spawn
        // -----------------------------------------------------------------------
        private void TrySpawnPlayer(ulong clientId)
        {
            if (spawnedClients.Contains(clientId))
            {
                Debug.Log($"[SpawnManager] Client {clientId} already has a player – skipping.");
                return;
            }

            spawnedClients.Add(clientId);
            SpawnPlayerForClient(clientId);
        }

        private void SpawnPlayerForClient(ulong clientId)
        {
            if (playerPrefab == null)
            {
                Debug.LogError("[SpawnManager] playerPrefab is not assigned in the Inspector!");
                return;
            }

            Vector3 spawnPos = GetNextSpawnPosition();
            NetworkObject instance = Instantiate(playerPrefab, spawnPos, Quaternion.identity);

            // SpawnAsPlayerObject assigns ownership to clientId, marks it as
            // ConnectedClients[clientId].PlayerObject, and replicates it to
            // all connected clients automatically.
            instance.SpawnAsPlayerObject(clientId, destroyWithScene: true);

            Debug.Log($"[SpawnManager] Spawned player for client {clientId} at {spawnPos}");
        }

        // -----------------------------------------------------------------------
        private Vector3 GetNextSpawnPosition()
        {
            if (spawnPositions == null || spawnPositions.Count == 0)
            {
                Debug.LogWarning("[SpawnManager] No spawn positions defined – using origin.");
                return Vector3.zero;
            }

            Vector3 pos = spawnPositions[nextSpawnIndex % spawnPositions.Count];
            nextSpawnIndex++;
            return pos;
        }
    }
}