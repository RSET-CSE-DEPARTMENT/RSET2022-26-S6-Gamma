using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class GameManagerFinal : MonoBehaviour
{
    public Transform player;
    public GameObject[] hiders; // Assign all Hiders in the Inspector
    public Transform[] spawnPoints;
    public UIController uiController;
    public float roundDuration = 60f;

    public TMPro.TMP_Text countdownText; // Countdown UI Text

    // Audio Clips
    public AudioClip countdownBeep;
    public AudioClip winSound;
    public AudioClip loseSound;

    private AudioSource audioSource;

    private float timer;
    private int hidersCaught = 0;
    private int totalHiders = 0;
    public bool gamePaused = true;
    public bool onMenu = true;

    private void Start()
    {
        FreezeAgents();
        audioSource = GetComponent<AudioSource>();
        if (!audioSource) audioSource = gameObject.AddComponent<AudioSource>();

        gamePaused = true;
        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;

        countdownText.gameObject.SetActive(false);
    }

    public void StartGameplay()
    {
        onMenu = false;
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;

        uiController.gameUI.SetActive(true);
        totalHiders = Mathf.Clamp(PlayerPrefs.GetInt("HiderCount", 1), 1, hiders.Length);
        hidersCaught = 0;
        timer = roundDuration;

        SpawnPlayerAndHiders();
        FreezeAgents();
        StartCoroutine(StartCountdown());

        uiController.UpdateScore(hidersCaught, totalHiders);
        uiController.UpdateTimer(timer);
    }

    private void Update()
    {
        if (gamePaused) return;

        if (timer > 0)
        {
            timer -= Time.deltaTime;
            uiController.UpdateTimer(timer);

            if (timer <= 0)
                EndGame(false);
        }
    }

    void SpawnPlayerAndHiders()
    {
        if (spawnPoints.Length < totalHiders + 1)
        {
            Debug.LogError("Not enough spawn points! Assign more.");
            return;
        }

        player.position = spawnPoints[0].position;

        for (int i = 0; i < hiders.Length; i++)
        {
            if (i < totalHiders)
            {
                hiders[i].transform.position = spawnPoints[i + 1].position;
                hiders[i].SetActive(false);
            }
            else
            {
                hiders[i].SetActive(false);
            }
        }
    }

    public void HiderCaught()
    {
        hidersCaught++;
        uiController.UpdateScore(hidersCaught, totalHiders);

        if (hidersCaught >= totalHiders)
            EndGame(true);
    }

    void EndGame(bool won)
    {
        gamePaused = true;
        onMenu = true;
        uiController.gameUI.SetActive(false);
        FreezeAgents();
        uiController.ShowEndScreen(won, roundDuration - timer);

        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;

        //  Play win/lose sound
        if (won && winSound) audioSource.PlayOneShot(winSound);
        else if (!won && loseSound) audioSource.PlayOneShot(loseSound);
    }

    private IEnumerator StartCountdown()
    {
        countdownText.gameObject.SetActive(true);
        player.gameObject.SetActive(true);

        string[] countdownSteps = { "3", "2", "1", "Go!" };

        foreach (string step in countdownSteps)
        {
            countdownText.text = step;

            //  Play countdown beep (except "Go!")
            if (step != "Go!" && countdownBeep)
            {
                audioSource.PlayOneShot(countdownBeep);
            }


            yield return new WaitForSeconds(step == "Go!" ? 1f : 0.5f);
            countdownText.gameObject.SetActive(false);
            yield return new WaitForSeconds(0.5f);
            audioSource.Stop();
            countdownText.gameObject.SetActive(true);
        }

        countdownText.gameObject.SetActive(false);

        gamePaused = false;
        UnfreezeAgents();

        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }

    private void FreezeAgents()
    {
        gamePaused = true;
        player.gameObject.SetActive(false);

        for (int i = 0; i < totalHiders; i++)
        {
            hiders[i].SetActive(false);
        }
    }

    private void UnfreezeAgents()
    {
        gamePaused = false;
        player.gameObject.SetActive(true);

        for (int i = 0; i < totalHiders; i++)
        {
            hiders[i].SetActive(true);
        }
    }
}
