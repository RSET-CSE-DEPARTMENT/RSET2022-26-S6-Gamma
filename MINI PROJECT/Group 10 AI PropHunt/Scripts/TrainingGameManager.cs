using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class TrainingGameManager : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private HiderAI hiderAgent;
    [SerializeField] private SeekerAI seekerAgent;
    [SerializeField] private Transform[] spawnPoints; // Set spawn points in the Inspector

    [Header("Game Settings")]
    [SerializeField] private float roundDuration = 60f; // Time before round ends

    [Header("Telemetry")]
    [SerializeField] private float timer;

    public bool caught;
    public bool won;

    private void Start()
    {
        StartNewRound();
    }

    private void Update()
    {
        // Update the round timer
        timer -= Time.deltaTime;
        // If the timer reaches zero, end the round
        if (timer <= 0)
        {
            Debug.Log("Hider won. Restarting round.");
            won = true;
            EndRound();
        }
        if (caught)
        {
            Debug.Log("Seeker won. Restarting round.");
            EndRound();
        }
    }

    public void OnHiderCaught()
    {
        // Hider was caught -> Reset positions and restart the round
        caught = true;
        //RestartRound();
    }

    private void RestartRound()
    {
        ResetPositions();
        StartNewRound();
    }

    private void StartNewRound()
    {
        caught = false;
        won = false;
        timer = roundDuration;
        ResetPositions();
    }

    private void EndRound()
    {
        RestartRound();
    }

    private void ResetPositions()
    {
        seekerAgent.Reset();
        if (spawnPoints.Length < 2)
        {
            Debug.LogError("Not enough spawn points! At least 2 are required.");
            return;
        }

        // Create a list of available spawn points
        List<int> availableIndices = new List<int>();
        for (int i = 0; i < spawnPoints.Length; i++)
        {
            availableIndices.Add(i);
        }

        // Select a random spawn point for the Hider
        int hiderSpawnIndex = Random.Range(0, availableIndices.Count);
        hiderAgent.transform.position = spawnPoints[availableIndices[hiderSpawnIndex]].position;

        // Remove the used spawn index to prevent duplicates
        availableIndices.RemoveAt(hiderSpawnIndex);

        // Select a different spawn point for the Seeker
        int seekerSpawnIndex = Random.Range(0, availableIndices.Count);
        seekerAgent.transform.position = spawnPoints[availableIndices[seekerSpawnIndex]].position;
    }
}