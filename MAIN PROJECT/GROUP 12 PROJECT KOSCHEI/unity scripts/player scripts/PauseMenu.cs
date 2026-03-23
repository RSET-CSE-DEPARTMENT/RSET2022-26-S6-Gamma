using Unity.Netcode;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;
using TMPro;
using StarterAssets;

namespace Koshcei
{
    /// <summary>
    /// Local-only pause menu. Each player manages their own instance —
    /// no network traffic is involved. The menu is driven entirely by
    /// the owning client; remote players are completely unaffected.
    /// 
    /// Setup:
    ///   • Add this script to the Player prefab (same GameObject as
    ///     ThirdPersonController / ThirdPersonShooterController).
    ///   • Assign the pauseMenuRoot Canvas in the Inspector.
    ///   • Wire up the Resume and Return buttons in the Inspector.
    /// </summary>
    public class PauseMenu : NetworkBehaviour
    {
        // -----------------------------------------------------------------------
        // Inspector
        // -----------------------------------------------------------------------
        [Header("UI")]
        [Tooltip("The root Canvas or Panel that makes up the pause menu.")]
        [SerializeField] private GameObject pauseMenuRoot;

        [SerializeField] private Button resumeButton;
        [SerializeField] private Button returnToLoginButton;

        // -----------------------------------------------------------------------
        // Private state
        // -----------------------------------------------------------------------
        private bool isPaused = false;

        // Component references cached on spawn
        private StarterAssetsInputs starterInputs;

        // -----------------------------------------------------------------------
        // NGO lifecycle
        // -----------------------------------------------------------------------
        public override void OnNetworkSpawn()
        {
            base.OnNetworkSpawn();

            // Only the owning client runs any pause logic.
            // On all other clients this script does nothing.
            if (!IsOwner)
            {
                enabled = false;
                return;
            }

            // Cache components
            starterInputs = GetComponent<StarterAssetsInputs>();

            // Wire up buttons
            if (resumeButton != null) resumeButton.onClick.AddListener(Resume);
            if (returnToLoginButton != null) returnToLoginButton.onClick.AddListener(ReturnToLogin);

            // Make sure the menu starts hidden
            SetMenuVisible(false);

            Debug.Log("[PauseMenu] Initialised for local owner.");
        }

        public override void OnNetworkDespawn()
        {
            base.OnNetworkDespawn();

            if (!IsOwner) return;

            // If the object is despawned while paused (e.g. scene change),
            // restore cursor so it doesn't stay locked
            // Do NOT restore cursor here — if we're despawning because the player
            // clicked "Exit to Login", the cursor is already unlocked for the menu.
            // Calling RestoreCursor(false) here would re-lock it on the login screen.

            if (resumeButton != null) resumeButton.onClick.RemoveListener(Resume);
            if (returnToLoginButton != null) returnToLoginButton.onClick.RemoveListener(ReturnToLogin);
        }

        // -----------------------------------------------------------------------
        // Update — only runs on the owning client (non-owners have enabled=false)
        // -----------------------------------------------------------------------
        private void Update()
        {
            if (Keyboard.current != null && Keyboard.current.escapeKey.wasPressedThisFrame)
            {
                if (isPaused) Resume();
                else Pause();
            }
        }

        // -----------------------------------------------------------------------
        // Pause / Resume
        // -----------------------------------------------------------------------
        private void Pause()
        {
            isPaused = true;
            SetMenuVisible(true);
            SetControlsEnabled(false);
            RestoreCursor(true); // unlock + show cursor for menu interaction
            Debug.Log("[PauseMenu] Paused.");
        }

        public void Resume()
        {
            isPaused = false;
            SetMenuVisible(false);
            SetControlsEnabled(true);
            RestoreCursor(false); // re-lock cursor for gameplay
            Debug.Log("[PauseMenu] Resumed.");
        }

        // -----------------------------------------------------------------------
        // Return to login — leaves the lobby and loads the login scene
        // -----------------------------------------------------------------------
        private void ReturnToLogin()
        {
            Debug.Log("[PauseMenu] Returning to login.");

            // Restore cursor before any scene transitions
            RestoreCursor(true);

            // LeaveLobby handles NetworkManager shutdown and scene loading
            if (LobbyManager.Instance != null)
                LobbyManager.Instance.LeaveLobby();
            else
            {
                // Fallback if LobbyManager is somehow gone
                if (NetworkManager.Singleton != null && NetworkManager.Singleton.IsListening)
                    NetworkManager.Singleton.Shutdown();

                UnityEngine.SceneManagement.SceneManager.LoadScene("LoginScene");
            }
        }

        // -----------------------------------------------------------------------
        // Helpers
        // -----------------------------------------------------------------------
        private void SetMenuVisible(bool visible)
        {
            if (pauseMenuRoot != null)
                pauseMenuRoot.SetActive(visible);
        }

        /// <summary>
        /// Enables or disables the input components that drive movement and shooting.
        /// Disabling PlayerInput stops ALL input actions from firing.
        /// Disabling StarterAssetsInputs clears any latched input values.
        /// </summary>
        private void SetControlsEnabled(bool controlsEnabled)
        {
            // Disable StarterAssetsInputs to stop all gameplay input callbacks.
            // PlayerInput is intentionally left enabled — the EventSystem's
            // InputSystemUIInputModule reads directly from the Input System,
            // not through PlayerInput, so UI button clicks work fine either way.
            if (starterInputs != null) starterInputs.enabled = controlsEnabled;

            // Zero out any latched gameplay values so the character doesn't drift
            if (!controlsEnabled && starterInputs != null)
            {
                starterInputs.move = Vector2.zero;
                starterInputs.look = Vector2.zero;
                starterInputs.jump = false;
                starterInputs.sprint = false;
                starterInputs.aim = false;
                starterInputs.shoot = false;
            }
        }

        /// <summary>
        /// Shows or hides the system cursor and locks/unlocks it.
        /// </summary>
        private void RestoreCursor(bool showAndUnlock)
        {
            Cursor.lockState = showAndUnlock ? CursorLockMode.None : CursorLockMode.Locked;
            Cursor.visible = showAndUnlock;
        }
    }
}