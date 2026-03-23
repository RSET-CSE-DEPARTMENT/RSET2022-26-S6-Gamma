using UnityEngine;
using UnityEngine.UI;

public class UIController : MonoBehaviour
{
    public GameManagerFinal gameManagerFinal;
    public MainMenuController mainMenuController;

    public TMPro.TMP_Text timerText;
    public TMPro.TMP_Text scoreText;
    public GameObject pauseMenu;
    public GameObject endScreen;
    public GameObject gameUI;
    public TMPro.TMP_Text endMessage;
    public TMPro.TMP_Text timeTakenText;
    public Button resumeButton;
    public Button pauseMenuExitToMenuButton;
    public Button endScreenExitToMenuButton;
    public Button restartButton;

    private bool paused;

    private void Start()
    {
        paused = false;
        resumeButton.onClick.AddListener(TogglePauseMenu);
        pauseMenuExitToMenuButton.onClick.AddListener(ExitToMenu);
        restartButton.onClick.AddListener(Restart);
        endScreenExitToMenuButton.onClick.AddListener(ExitToMenu);
    }

    public void ExitToMenu()
    {
        endScreen.SetActive(false);
        pauseMenu.SetActive(false);
        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;
        mainMenuController.GoBackToMainMenu();
    }

    public void Restart()
    {
        endScreen.SetActive(false);
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
        gameManagerFinal.StartGameplay();
    }

    public void UpdateTimer(float time)
    {
        timerText.text = "Time: " + Mathf.Max(0, time).ToString("F1");
    }

    public void UpdateScore(int caught, int total)
    {
        scoreText.text = "Hiders Caught: " + caught + "/" + total;
    }

    public void ShowEndScreen(bool won, float timeTaken)
    {
        endScreen.SetActive(true);
        gameUI.SetActive(false);
        endMessage.text = won ? "You Win!" : "Game Over!";
        timeTakenText.text = "Time Taken: " + timeTaken.ToString("F1") + "s";
    }

    public void UpdateCountdown(string text)
    {
        timerText.text = text;
    }

    public void HideCountdown()
    {
        timerText.text = "";
    }

    public void TogglePauseMenu()
    {
        paused = !paused;
        pauseMenu.SetActive(paused);
        Time.timeScale = paused ? 0 : 1;

        if (paused)
        {
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
            resumeButton.onClick.AddListener(TogglePauseMenu);
            gameManagerFinal.gamePaused = true;
            gameUI.SetActive(false);
        }
        else
        {
            gameManagerFinal.gamePaused = false;
            gameUI.SetActive(true);
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
        }
    }
}
