using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Unity.Netcode;
using Unity.Netcode.Transports.UTP;
using Unity.Networking.Transport.Relay;
using Unity.Services.Authentication;
using Unity.Services.Core;
using Unity.Services.Lobbies;
using Unity.Services.Lobbies.Models;
using Unity.Services.Relay;
using Unity.Services.Relay.Models;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Koshcei
{
    [System.Serializable]
    public enum EncryptionType
    {
        DTLS, // Datagram Transport Layer Security  (standalone / mobile)
        WSS   // Web Socket Secure                  (WebGL builds)
    }

    public class LobbyManager : MonoBehaviour
    {
        // -----------------------------------------------------------------------
        // Inspector
        // -----------------------------------------------------------------------
        [SerializeField] private EncryptionType encryption = EncryptionType.DTLS;

        // -----------------------------------------------------------------------
        // Singleton
        // -----------------------------------------------------------------------
        public static LobbyManager Instance { get; private set; }

        // -----------------------------------------------------------------------
        // Events
        // -----------------------------------------------------------------------
        public event EventHandler<LobbyEventArgs> OnJoinedLobby;
        public event EventHandler<LobbyEventArgs> OnLobbyUpdate;
        public event EventHandler OnKickedFromLobby;

        public class LobbyEventArgs : EventArgs { public Lobby lobby; }

        // -----------------------------------------------------------------------
        // Private state
        // -----------------------------------------------------------------------
        private Lobby joinedLobby;
        private float heartbeatTimer;
        private float lobbyPollTimer;
        private float lobbyTimerMax = 300f;
        private float currentLobbyTimer;
        private string playerName = "Player";
        public string PlayerName => playerName;
        private bool isJoiningRelay = false;
        private System.Threading.CancellationTokenSource _searchCts;
        private int relayConnectAttempts = 0;
        private const int k_maxRelayConnectAttempts = 3;


        // -----------------------------------------------------------------------
        // Constants
        // -----------------------------------------------------------------------
        private const string k_dtlsEncryption = "dtls";
        private const string k_wssEncryption = "wss";
        private const string KEY_RELAY_CODE = "RelayCode";
        private const string KEY_START_TIME = "StartTime";
        private const string SCENE_NAME_GAME = "Scene_A";
        private const string SCENE_NAME_MENU = "LoginScene";

        private string ConnectionType =>
            encryption == EncryptionType.DTLS ? k_dtlsEncryption : k_wssEncryption;

        // -----------------------------------------------------------------------
        // Unity lifecycle
        // -----------------------------------------------------------------------
        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
                return;
            }
        }

        private void Start()
        {
            // OnClientDisconnectCallback fires when a connected client loses the server.
            // OnClientStopped fires when the local client stops for ANY reason including
            // failed connection attempts (the "Failed to connect to server" UTP error).
            // Both are needed to cover all disconnection paths.
            NetworkManager.Singleton.OnClientDisconnectCallback += OnClientDisconnected;
            NetworkManager.Singleton.OnClientStopped += OnClientStopped;
        }

        private void Update()
        {
            HandleLobbyHeartbeat();
            HandleLobbyPolling();
            HandleLobbyTimer();
        }

        private void OnDestroy()
        {
            if (NetworkManager.Singleton != null)
            {
                NetworkManager.Singleton.OnClientDisconnectCallback -= OnClientDisconnected;
                NetworkManager.Singleton.OnClientStopped -= OnClientStopped;
            }
        }

        // -----------------------------------------------------------------------
        // Disconnect handler
        // -----------------------------------------------------------------------
        private void OnClientDisconnected(ulong clientId)
        {
            // Fired on the server when a CLIENT leaves -- clean up but don't redirect
            if (NetworkManager.Singleton.IsServer && clientId != NetworkManager.Singleton.LocalClientId)
            {
                Debug.Log($"[LobbyManager] Client {clientId} disconnected from server.");
                return;
            }

            // Fired on a client when IT loses connection.
            // LocalClientId check handles both:
            //   -- Host leaves  -> server shuts down -> client gets disconnect with id=0 or its own id
            //   -- Transport timeout / host crash -> same path
            if (!NetworkManager.Singleton.IsServer &&
                clientId == NetworkManager.Singleton.LocalClientId)
            {
                string reason = NetworkManager.Singleton.DisconnectReason;
                Debug.Log($"[LobbyManager] Lost connection to host. Reason: " +
                          (string.IsNullOrEmpty(reason) ? "Host left or connection lost" : reason));

                ReturnToMenuCleanly();
            }
        }

        /// <summary>
        /// Safely tears down networking and lobby state then loads the login scene.
        /// Safe to call from any context (host or client, any scene).
        /// </summary>
        private void ReturnToMenuCleanly()
        {
            // Prevent re-entry if already cleaning up
            if (_returningToMenu) return;
            _returningToMenu = true;

            isJoiningRelay = false;
            relayConnectAttempts = 0;
            joinedLobby = null;


            // Unsubscribe BEFORE Shutdown so NGO callbacks don't fire during teardown
            if (NetworkManager.Singleton != null)
            {
                NetworkManager.Singleton.OnClientDisconnectCallback -= OnClientDisconnected;

                if (NetworkManager.Singleton.IsListening)
                    NetworkManager.Singleton.Shutdown();
            }

            if (LobbyUI.Instance != null)
                LobbyUI.Instance.SetUIInteractable(true);

            // Re-subscribe after a frame so the next session works
            StartCoroutine(ResubscribeAfterFrame());

            SceneManager.LoadScene(SCENE_NAME_MENU);
        }

        private bool _returningToMenu = false;

        private System.Collections.IEnumerator ResubscribeAfterFrame()
        {
            yield return null;
            _returningToMenu = false;
            if (NetworkManager.Singleton != null)
            {
                NetworkManager.Singleton.OnClientDisconnectCallback += OnClientDisconnected;
                NetworkManager.Singleton.OnClientStopped += OnClientStopped;
            }
        }

        // -----------------------------------------------------------------------
        // Fired when the local client stops for ANY reason -- including UTP-level
        // "Failed to connect to server" errors that never reach OnClientDisconnected.
        // The bool parameter is true if the stop was locally initiated (e.g. Shutdown).
        // -----------------------------------------------------------------------
        private void OnClientStopped(bool wasHost)
        {
            // If we called Shutdown ourselves (ReturnToMenuCleanly sets _returningToMenu
            // before shutting down), this is an expected stop -- ignore it.
            if (_returningToMenu) return;

            // If we are the host/server this fires for other reasons (clients leaving) -- ignore.
            if (wasHost) return;

            Debug.Log("[LobbyManager] Client stopped unexpectedly (failed connection or transport error). Returning to menu.");
            ReturnToMenuCleanly();
        }

        // -----------------------------------------------------------------------
        // Authentication
        // -----------------------------------------------------------------------
        public async void Authenticate(string name)
        {
            playerName = name;

            try
            {
                if (UnityServices.State == ServicesInitializationState.Uninitialized)
                {
                    InitializationOptions options = new InitializationOptions();
                    options.SetProfile(playerName);
                    await UnityServices.InitializeAsync(options);
                }

                AuthenticationService.Instance.SignedIn += () =>
                    Debug.Log($"[LobbyManager] Signed in as {AuthenticationService.Instance.PlayerId}");

                if (!AuthenticationService.Instance.IsSignedIn)
                    await AuthenticationService.Instance.SignInAnonymouslyAsync();

                SceneManager.LoadScene("LobbyScene");
            }
            catch (Exception e)
            {
                Debug.LogError("[LobbyManager] Authentication failed: " + e);
            }
        }

        // -----------------------------------------------------------------------
        // Quick Join or Create
        // -----------------------------------------------------------------------
        public async void QuickJoinOrCreate()
        {
            // Cancel any previous search and start a fresh one
            if (_searchCts != null) _searchCts.Cancel();
            _searchCts = new System.Threading.CancellationTokenSource();
            var token = _searchCts.Token;

            const int maxRetries = 3;
            int attempt = 0;

            while (attempt < maxRetries)
            {
                // Check before starting each attempt
                if (token.IsCancellationRequested) return;

                try
                {
                    Debug.Log($"[LobbyManager] QuickJoin attempt {attempt + 1}/{maxRetries}...");

                    QuickJoinLobbyOptions options = new QuickJoinLobbyOptions
                    {
                        Filter = new List<QueryFilter>
                        {
                            new QueryFilter(
                                field: QueryFilter.FieldOptions.S1,
                                op:    QueryFilter.OpOptions.EQ,
                                value: "India")
                        },
                        Player = GetPlayer()
                    };

                    joinedLobby = await LobbyService.Instance.QuickJoinLobbyAsync(options);

                    // Check immediately after the await returns -- leave may have been pressed
                    // while QuickJoinLobbyAsync was in flight. If so, undo the join and bail.
                    if (token.IsCancellationRequested)
                    {
                        Debug.Log("[LobbyManager] Cancelled after join -- leaving lobby.");
                        try
                        {
                            await LobbyService.Instance.RemovePlayerAsync(
                                joinedLobby.Id,
                                AuthenticationService.Instance.PlayerId);
                        }
                        catch { }
                        joinedLobby = null;
                        return;
                    }

                    isJoiningRelay = false;
                    Debug.Log($"[LobbyManager] Joined lobby: {joinedLobby.Name}");
                    OnJoinedLobby?.Invoke(this, new LobbyEventArgs { lobby = joinedLobby });
                    return;
                }
                catch (LobbyServiceException e)
                {
                    if (e.Reason == LobbyExceptionReason.NoOpenLobbies)
                    {
                        Debug.Log("[LobbyManager] No open lobbies -- retrying...");
                        attempt++;
                        try { await Task.Delay(2000, token); }
                        catch (System.OperationCanceledException) { return; }
                    }
                    else
                    {
                        Debug.LogWarning("[LobbyManager] QuickJoin failed: " + e.Message);
                        break;
                    }
                }
            }

            // Final check -- leave may have been pressed while the last attempt was in flight
            if (token.IsCancellationRequested)
            {
                Debug.Log("[LobbyManager] Search cancelled -- skipping lobby creation.");
                return;
            }

            Debug.Log("[LobbyManager] Retries exhausted -- creating new lobby.");
            CreateLobby("Public_Match", false);
        }

        // -----------------------------------------------------------------------
        // Create Lobby
        // -----------------------------------------------------------------------
        public async void CreateLobby(string lobbyName, bool isPrivate)
        {
            try
            {
                CreateLobbyOptions options = new CreateLobbyOptions
                {
                    IsPrivate = isPrivate,
                    Player = GetPlayer(),
                    Data = new Dictionary<string, DataObject>
                    {
                        { KEY_START_TIME, new DataObject(DataObject.VisibilityOptions.Member,
                            DateTime.UtcNow.Ticks.ToString()) },
                        { "GameRegion",   new DataObject(DataObject.VisibilityOptions.Public,
                            "India", DataObject.IndexOptions.S1) }
                    }
                };

                Lobby lobby = await LobbyService.Instance.CreateLobbyAsync(lobbyName, 4, options);
                joinedLobby = lobby;
                isJoiningRelay = false;

                Debug.Log($"[LobbyManager] Created lobby: {lobby.Name}");
                OnJoinedLobby?.Invoke(this, new LobbyEventArgs { lobby = lobby });

            }
            catch (LobbyServiceException e)
            {
                Debug.LogError("[LobbyManager] CreateLobby failed: " + e);
            }
        }

        // -----------------------------------------------------------------------
        // Start Game  (host only)
        // -----------------------------------------------------------------------
        public async void StartGame()
        {
            if (!IsLobbyHost()) return;

            try
            {
                Debug.Log("[LobbyManager] Host starting game...");

                if (LobbyUI.Instance != null)
                    LobbyUI.Instance.SetUIInteractable(false);

                Allocation allocation = await AllocateRelay();
                if (allocation.AllocationId == Guid.Empty)
                {
                    Debug.LogError("[LobbyManager] Relay allocation returned empty -- aborting.");
                    if (LobbyUI.Instance != null) LobbyUI.Instance.SetUIInteractable(true);
                    return;
                }

                string relayCode = await GetRelayJoinCode(allocation);
                if (string.IsNullOrEmpty(relayCode))
                {
                    Debug.LogError("[LobbyManager] Relay join code is empty -- aborting.");
                    if (LobbyUI.Instance != null) LobbyUI.Instance.SetUIInteractable(true);
                    return;
                }

                Debug.Log($"[LobbyManager] Relay code: {relayCode}");

                // Set transport relay data BEFORE StartHost
                NetworkManager.Singleton
                    .GetComponent<UnityTransport>()
                    .SetRelayServerData(new RelayServerData(allocation, ConnectionType));

                // Temporary approval callback -- just approves the connection.
                // CreatePlayerObject MUST be false here. If it were true and a client
                // connected before the game scene finished loading, NGO would send the
                // spawn message before the client was in the right scene, causing the
                // "Deferred messages -- trigger not received within 10s" error and players
                // not appearing. SpawnManager.OnSceneLoadEventCompleted handles all spawning
                // once every client has confirmed the scene is loaded.
                NetworkManager.Singleton.ConnectionApprovalCallback = (request, response) =>
                {
                    response.Approved = true;
                    response.CreatePlayerObject = false;
                    response.Pending = false;
                    Debug.Log("[LobbyManager] Temp approval -- player spawn deferred to SpawnManager.");
                };

                bool started = NetworkManager.Singleton.StartHost();
                if (!started)
                {
                    Debug.LogError("[LobbyManager] StartHost() returned false!");
                    NetworkManager.Singleton.ConnectionApprovalCallback = null;
                    if (LobbyUI.Instance != null) LobbyUI.Instance.SetUIInteractable(true);
                    LeaveLobby();
                    return;
                }

                Debug.Log("[LobbyManager] Host started. Pushing relay code to lobby...");

                // Push relay code so clients can start joining during scene load
                await LobbyService.Instance.UpdateLobbyAsync(joinedLobby.Id, new UpdateLobbyOptions
                {
                    IsLocked = true,
                    Data = new Dictionary<string, DataObject>
                    {
                        { KEY_RELAY_CODE, new DataObject(DataObject.VisibilityOptions.Member, relayCode) }
                    }
                });

                Debug.Log("[LobbyManager] Relay code pushed. Loading game scene...");
                NetworkManager.Singleton.SceneManager.LoadScene(SCENE_NAME_GAME, LoadSceneMode.Single);
            }
            catch (Exception e)
            {
                Debug.LogError("[LobbyManager] StartGame failed: " + e);
                NetworkManager.Singleton.ConnectionApprovalCallback = null;
                if (LobbyUI.Instance != null) LobbyUI.Instance.SetUIInteractable(true);
                LeaveLobby();
            }
        }

        // -----------------------------------------------------------------------
        // Leave Lobby
        // -----------------------------------------------------------------------
        public async void LeaveLobby()
        {
            if (joinedLobby != null)
            {
                try
                {
                    if (IsLobbyHost())
                        await LobbyService.Instance.DeleteLobbyAsync(joinedLobby.Id);
                    else
                        await LobbyService.Instance.RemovePlayerAsync(
                        joinedLobby.Id,
                        AuthenticationService.Instance.PlayerId);
                }
                catch (Exception e)
                {
                    Debug.LogWarning("[LobbyManager] LeaveLobby cleanup: " + e.Message);
                }

                joinedLobby = null;
            }

            ReturnToMenuCleanly();
        }

        // -----------------------------------------------------------------------
        // Relay allocation helpers
        // -----------------------------------------------------------------------
        private async Task<Allocation> AllocateRelay()
        {
            try
            {
                Allocation allocation = await RelayService.Instance.CreateAllocationAsync(3);
                return allocation;
            }
            catch (RelayServiceException e)
            {
                Debug.LogError("[LobbyManager] AllocateRelay failed: " + e.Message);
                return default;
            }
        }

        private async Task<string> GetRelayJoinCode(Allocation allocation)
        {
            try
            {
                return await RelayService.Instance.GetJoinCodeAsync(allocation.AllocationId);
            }
            catch (RelayServiceException e)
            {
                Debug.LogError("[LobbyManager] GetRelayJoinCode failed: " + e.Message);
                return default;
            }
        }

        private async Task<JoinAllocation> JoinRelayAllocation(string relayCode)
        {
            try
            {
                return await RelayService.Instance.JoinAllocationAsync(relayCode);
            }
            catch (RelayServiceException e)
            {
                Debug.LogError("[LobbyManager] JoinRelayAllocation failed: " + e.Message);
                return default;
            }
        }

        // -----------------------------------------------------------------------
        // Client relay join -- called from polling when relay code appears
        // -----------------------------------------------------------------------
        private async void JoinRelay(string relayCode)
        {
            if (isJoiningRelay) return;
            isJoiningRelay = true;

            try
            {
                Debug.Log($"[LobbyManager] Client joining relay (attempt {relayConnectAttempts + 1}): {relayCode}");

                if (LobbyUI.Instance != null)
                    LobbyUI.Instance.SetUIInteractable(false);

                JoinAllocation joinAllocation = await JoinRelayAllocation(relayCode);
                if (joinAllocation == null)
                {
                    Debug.LogError("[LobbyManager] JoinAllocation returned null.");
                    isJoiningRelay = false;
                    if (LobbyUI.Instance != null) LobbyUI.Instance.SetUIInteractable(true);
                    return;
                }

                // -----------------------------------------------------------------
                // KEY FIX: Set relay server data on the transport, then yield one
                // frame so UTP's internal NetworkDriver can process the endpoint
                // configuration before StartClient fires its first handshake packet.
                //
                // Without this yield, UTP may send the initial DTLS/connect packet
                // before the relay endpoint is committed inside the driver, which is
                // what causes "Failed to connect to server" in ProcessEvent/Update.
                // -----------------------------------------------------------------
                NetworkManager.Singleton
                    .GetComponent<UnityTransport>()
                    .SetRelayServerData(new RelayServerData(joinAllocation, ConnectionType));

                await Task.Yield(); // one engine frame -- lets UTP commit relay config

                bool success = NetworkManager.Singleton.StartClient();
                if (!success)
                {
                    Debug.LogError("[LobbyManager] StartClient() returned false.");
                    isJoiningRelay = false;
                    if (LobbyUI.Instance != null) LobbyUI.Instance.SetUIInteractable(true);
                    LeaveLobby();
                }
                else
                {
                    relayConnectAttempts++;
                    Debug.Log("[LobbyManager] StartClient() succeeded -- awaiting server handshake...");
                }
            }
            catch (Exception e)
            {
                Debug.LogError("[LobbyManager] JoinRelay failed: " + e);
                isJoiningRelay = false;
                if (LobbyUI.Instance != null) LobbyUI.Instance.SetUIInteractable(true);
                LeaveLobby();
            }
        }

        // -----------------------------------------------------------------------
        // Heartbeat
        // -----------------------------------------------------------------------
        private async void HandleLobbyHeartbeat()
        {
            if (joinedLobby == null || !IsLobbyHost()) return;
            if (SceneManager.GetActiveScene().name == SCENE_NAME_GAME) return;

            heartbeatTimer -= Time.deltaTime;
            if (heartbeatTimer > 0f) return;

            heartbeatTimer = 15f;
            try
            {
                await LobbyService.Instance.SendHeartbeatPingAsync(joinedLobby.Id);
            }
            catch (Exception e)
            {
                Debug.LogWarning("[LobbyManager] Heartbeat failed: " + e.Message);
            }
        }

        // -----------------------------------------------------------------------
        // Polling
        // -----------------------------------------------------------------------
        private async void HandleLobbyPolling()
        {
            if (joinedLobby == null || isJoiningRelay) return;
            if (SceneManager.GetActiveScene().name == SCENE_NAME_GAME) return;

            lobbyPollTimer -= Time.deltaTime;
            if (lobbyPollTimer > 0f) return;

            lobbyPollTimer = 1.5f;

            try
            {
                Lobby lobby = await LobbyService.Instance.GetLobbyAsync(joinedLobby.Id);
                joinedLobby = lobby;

                try { OnLobbyUpdate?.Invoke(this, new LobbyEventArgs { lobby = joinedLobby }); }
                catch (Exception uiEx)
                {
                    Debug.LogWarning("[LobbyManager] UI update error (network intact): " + uiEx);
                }

                // Non-host: check for relay code pushed by host
                if (!IsLobbyHost() &&
                    joinedLobby.Data != null &&
                    joinedLobby.Data.ContainsKey(KEY_RELAY_CODE) &&
                    !string.IsNullOrEmpty(joinedLobby.Data[KEY_RELAY_CODE].Value))
                {
                    string relayCode = joinedLobby.Data[KEY_RELAY_CODE].Value;
                    joinedLobby = null; // clear BEFORE async relay join to stop further polls
                    JoinRelay(relayCode);
                }
            }
            catch (LobbyServiceException e)
            {
                if (e.Reason == LobbyExceptionReason.RateLimited)
                {
                    Debug.LogWarning("[LobbyManager] Rate limited -- backing off.");
                    lobbyPollTimer = 5f;
                    return;
                }

                Debug.LogError("[LobbyManager] Lobby lost: " + e.Message);
                joinedLobby = null;
                SceneManager.LoadScene(SCENE_NAME_MENU);
            }
        }

        // -----------------------------------------------------------------------
        // Lobby countdown timer
        // -----------------------------------------------------------------------
        private void HandleLobbyTimer()
        {
            // Once everyone is in the game scene the lobby timer is no longer needed.
            // Stop it immediately so it can never kick the host out mid-game.
            if (SceneManager.GetActiveScene().name == SCENE_NAME_GAME)
            {
                currentLobbyTimer = 0f;
                return;
            }

            if (joinedLobby?.Data == null ||
                !joinedLobby.Data.ContainsKey(KEY_START_TIME)) return;

            long ticks = long.Parse(joinedLobby.Data[KEY_START_TIME].Value);
            DateTime startTime = new DateTime(ticks, DateTimeKind.Utc);
            float elapsed = (float)(DateTime.UtcNow - startTime).TotalSeconds;
            currentLobbyTimer = lobbyTimerMax - elapsed;

            if (currentLobbyTimer <= 0f)
            {
                Debug.Log("[LobbyManager] Lobby timed out.");
                LeaveLobby();
            }
        }

        // -----------------------------------------------------------------------
        // Public helpers
        // -----------------------------------------------------------------------
        public bool IsLobbyHost() =>
            joinedLobby != null &&
            AuthenticationService.Instance.IsSignedIn &&
            joinedLobby.HostId == AuthenticationService.Instance.PlayerId;

        public float GetLobbyTimer() => currentLobbyTimer;
        public Lobby GetJoinedLobby() => joinedLobby;

        private Player GetPlayer() => new Player
        {
            Data = new Dictionary<string, PlayerDataObject>
            {
                { "PlayerName", new PlayerDataObject(PlayerDataObject.VisibilityOptions.Member, playerName) }
            }
        };
    }
}