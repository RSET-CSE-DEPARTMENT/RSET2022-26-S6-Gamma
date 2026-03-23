using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class spheremover : MonoBehaviour
{
    [Header("Path Settings")]
    public List<Vector3> points = new List<Vector3>(); // Editable in Inspector
    public float speed = 3f;
    public float arriveThreshold = 0.1f;

    private int currentIndex = 0;

    void Update()
    {
        if (points == null || points.Count == 0) return;

        Vector3 target = points[currentIndex];
        float distThisFrame = speed * Time.deltaTime;

        Vector3 dir = target - transform.position;

        if (dir.magnitude <= arriveThreshold)
        {
            currentIndex = (currentIndex + 1) % points.Count;
        }
        else
        {
            transform.position += dir.normalized * distThisFrame;
        }
    }
}
