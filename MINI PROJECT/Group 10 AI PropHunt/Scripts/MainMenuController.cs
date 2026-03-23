using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

public class MainMenuController : MonoBehaviour
{
    public GameObject hiderSelectionPanel;
    public GameObject mainMenuPanel;
    public GameManagerFinal gameManagerFinal;
    [SerializeField] public TMPro.TMP_Dropdown hiderDropdown;
    public Button playButton;
    public Button exitButton;
    public Button startButton;

    private void Start()
    {
        mainMenuPanel.SetActive(true);
        Cursor.lockState = CursorLockMode.None; // Unlock cursor
        Cursor.visible = true; // Show cursor
        gameManagerFinal.onMenu = true;

        playButton.onClick.AddListener(OpenHiderSelection);
        exitButton.onClick.AddListener(ExitGame);
        
    }

    public void GoBackToMainMenu()
    {
        mainMenuPanel.SetActive(true);
        gameManagerFinal.onMenu = true;
        Cursor.lockState = CursorLockMode.None; // Unlock cursor
        Cursor.visible = true; // Show cursor

        playButton.onClick.AddListener(OpenHiderSelection);
        exitButton.onClick.AddListener(ExitGame);
    }

    public void OpenHiderSelection()
    {
        mainMenuPanel.SetActive(false);
        Cursor.lockState = CursorLockMode.None; // Unlock cursor
        Cursor.visible = true; // Show cursor
        gameManagerFinal.onMenu = true;
        hiderSelectionPanel.SetActive(true);
        startButton.onClick.AddListener(StartGame);
    }

    public void StartGame()
    {
        gameManagerFinal.gamePaused = false;
        hiderSelectionPanel.SetActive(false);
        PlayerPrefs.SetInt("HiderCount", hiderDropdown.value + 1);
        gameManagerFinal.StartGameplay();
    }

    public void ExitGame()
    {
        Application.Quit();
    }
}
