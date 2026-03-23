using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace Koshcei
{
    public class AuthenticateUI : MonoBehaviour
    {
        [SerializeField] private TMP_InputField usernameInput;
        [SerializeField] private Button playButton;
        [SerializeField] private Button quitButton;

        private void Awake()
        {
            if (quitButton != null)
                quitButton.onClick.AddListener(() =>
                {
#if UNITY_EDITOR
                    UnityEditor.EditorApplication.isPlaying = false;
#else
                    Application.Quit();
#endif
                });

            playButton.onClick.AddListener(() =>
            {
                string name = usernameInput.text.Trim();

                if (string.IsNullOrEmpty(name))
                {
                    Debug.LogWarning("[AuthenticateUI] Username cannot be empty.");
                    return;
                }

                if (LobbyManager.Instance == null)
                {
                    Debug.LogError("[AuthenticateUI] LobbyManager.Instance is null! " +
                                   "Add LobbyManager to the LoginScene.");
                    return;
                }

                playButton.interactable = false; // prevent double-click
                LobbyManager.Instance.Authenticate(name);
            });
        }
    }
}