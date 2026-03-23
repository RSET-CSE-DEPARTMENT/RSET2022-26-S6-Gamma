using TMPro;
using Unity.Services.Lobbies.Models;
using UnityEngine;
using UnityEngine.UI;

namespace Koshcei
{
    public class LobbyUI : MonoBehaviour
    {
        public static LobbyUI Instance { get; private set; }

        [Header("Game Settings")]
        [Tooltip("Minimum players required before the host can start the game.")]
        [SerializeField] private int minPlayersToStart = 2;

        [Header("UI References")]
        [SerializeField] private TextMeshProUGUI lobbyIdText;
        [SerializeField] private TextMeshProUGUI timerText;
        [SerializeField] private Button startGameButton;
        [SerializeField] private Button leaveLobbyButton;
        [SerializeField] private Transform container;
        [SerializeField] private Transform playerRowTemplate;

        private void Awake()
        {
            Instance = this;
            playerRowTemplate.gameObject.SetActive(false);
        }

        private void Start()
        {
            if (LobbyManager.Instance == null)
            {
                Debug.LogError("[LobbyUI] LobbyManager.Instance is null! " +
                               "Make sure LobbyManager exists in LoginScene and is DontDestroyOnLoad.");
                return;
            }

            LobbyManager.Instance.OnJoinedLobby += OnLobbyStateChanged;
            LobbyManager.Instance.OnLobbyUpdate += OnLobbyStateChanged;

            startGameButton.onClick.AddListener(() =>
            {
                if (LobbyManager.Instance.IsLobbyHost())
                    LobbyManager.Instance.StartGame();
            });

            if (leaveLobbyButton != null)
                leaveLobbyButton.onClick.AddListener(() => LobbyManager.Instance.LeaveLobby());

            SetUIInteractable(false);

            LobbyManager.Instance.QuickJoinOrCreate();
        }

        private void OnDestroy()
        {
            if (LobbyManager.Instance == null) return;
            LobbyManager.Instance.OnJoinedLobby -= OnLobbyStateChanged;
            LobbyManager.Instance.OnLobbyUpdate -= OnLobbyStateChanged;
        }

        private void Update()
        {
            if (LobbyManager.Instance == null || timerText == null) return;

            float t = LobbyManager.Instance.GetLobbyTimer();
            timerText.text = t > 0f ? "Time Left: " + Mathf.Ceil(t).ToString("0") + "s" : "";
        }

        // -----------------------------------------------------------------------

        private void OnLobbyStateChanged(object sender, LobbyManager.LobbyEventArgs e)
        {
            if (e.lobby != null) UpdateLobbyUI(e.lobby);
        }

        private void UpdateLobbyUI(Lobby lobby)
        {
            if (lobbyIdText != null)
                lobbyIdText.text = "Lobby: " + lobby.Name;

            // Rebuild player list
            foreach (Transform child in container)
            {
                if (child == playerRowTemplate) continue;
                Destroy(child.gameObject);
            }

            foreach (Player player in lobby.Players)
            {
                Transform row = Instantiate(playerRowTemplate, container);
                row.gameObject.SetActive(true);

                TextMeshProUGUI nameText = row.GetComponentInChildren<TextMeshProUGUI>();
                if (nameText == null) continue;

                nameText.text = (player.Data != null && player.Data.ContainsKey("PlayerName"))
                    ? player.Data["PlayerName"].Value
                    : "Player " + player.Id.Substring(0, 4);
            }

            UpdateStartButtonState(lobby);
        }

        private void UpdateStartButtonState(Lobby lobby)
        {
            if (startGameButton == null) return;

            TextMeshProUGUI btnText = startGameButton.GetComponentInChildren<TextMeshProUGUI>();

            if (LobbyManager.Instance.IsLobbyHost())
            {
                bool ready = lobby.Players.Count >= minPlayersToStart;
                startGameButton.interactable = ready;

                if (btnText)
                    btnText.text = ready
                        ? "Start Game"
                        : $"Waiting ({lobby.Players.Count}/{minPlayersToStart})";
            }
            else
            {
                startGameButton.interactable = false;
                if (btnText) btnText.text = "Waiting for Host";
            }
        }

        /// <summary>Disables all interactive buttons during connection / scene transition.</summary>
        public void SetUIInteractable(bool interactable)
        {
            if (startGameButton != null) startGameButton.interactable = interactable;
            // Leave button is always enabled -- player should always be able to exit
        }
    }
}