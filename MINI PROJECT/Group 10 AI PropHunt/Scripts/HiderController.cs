using System.Collections;
using UnityEngine;
using UnityEngine.AI;

public class HiderController : MonoBehaviour
{
    [Header("References")]

    [Header("Movement Settings")]
    [SerializeField] public float moveSpeed = 3f;
    [SerializeField] public float rotationSpeed = 120f;

    [Header("Transformation Settings")]
    [SerializeField] private int currentFormIndex = 0; // Tracks the current form
    [SerializeField] private float transformCooldown = 5f;
    [SerializeField] private float transformDuration = 10f; // Time before reverting
    private float lastTransformEndTime = -Mathf.Infinity;
    private float transformStartTime = -Mathf.Infinity;

    [Header("Telemetry")]
    [SerializeField] private float transformationDurationDebug;
    [SerializeField] private float transformationCoolDownDebug;

    private Transform[] formObjects;
    private Coroutine revertCoroutine;

    private Vector3 previousPosition;
    private Vector3 velocity;

    private Quaternion lastRotation;
    public Vector3 angularVelocity;

    void Start()
    {
        transformationCoolDownDebug = 0f;
        transformationDurationDebug = 0f;
        lastRotation = transform.rotation;

        int childCount = transform.childCount; // Do not subtract 1, ensure all children are counted
        formObjects = new Transform[childCount];

        for (int i = 0; i < childCount; i++)
        {
            formObjects[i] = transform.GetChild(i);
            if (formObjects[i] == null)
            {
                Debug.LogError($"HiderController: Child object at index {i} is NULL!");
            }
        }

        if (formObjects.Length == 0)
        {
            Debug.LogError("HiderController: No form objects found! Check prefab structure.");
        }

        ActivateForm(currentFormIndex);
    }


    private void Update()
    {
        // Calculate velocity manually
        velocity = (transform.position - previousPosition) / Time.deltaTime;
        previousPosition = transform.position;

        // Calculate the difference in rotation
        Quaternion deltaRotation = transform.rotation * Quaternion.Inverse(lastRotation);

        // Convert to angular velocity (radians per second)
        deltaRotation.ToAngleAxis(out float angle, out Vector3 axis);
        angularVelocity = (axis * angle * Mathf.Deg2Rad) / Time.deltaTime;

        // Store current rotation for next frame
        lastRotation = transform.rotation;

    }

    public void Move(float direction)
    {
        transform.position += transform.forward * moveSpeed * direction * Time.deltaTime;
    }

    public void Turn(float direction)
    {
        transform.Rotate(Vector3.up, rotationSpeed * direction * Time.deltaTime);
    }

    public void TransformHider(int formIndex)
    {
        if (GetTransformCooldownRemaining() > 0f || transformationDurationDebug > 0f || formIndex == currentFormIndex)
            return;
        if (formIndex == 0)
        {
            ActivateForm(0);
            transformStartTime = -Mathf.Infinity;
            transformationDurationDebug = 0f;
            lastTransformEndTime = Time.time;
            return;
        }
        if (formIndex > 0 && formIndex < formObjects.Length)
        {
            transformStartTime = Time.time;
            ActivateForm(formIndex);
            transformationCoolDownDebug = 0f;
            

            // Start revert timer if transformed into another form
            if (revertCoroutine != null)
                StopCoroutine(revertCoroutine);

            revertCoroutine = StartCoroutine(RevertToOriginalAfterDelay());
        }
    }

    public void ActivateForm(int formIndex)
    {
        for (int i = 0; i < formObjects.Length; i++)
        {
            formObjects[i].gameObject.SetActive(i == formIndex);
        }
        currentFormIndex = formIndex;
    }

    private IEnumerator RevertToOriginalAfterDelay()
    {
        yield return new WaitForSeconds(transformDuration);

        ActivateForm(0); // Revert back to original form

        // Ensure cooldown starts **after** reverting
        lastTransformEndTime = Time.time;
        transformationDurationDebug = 0f;
        transformationCoolDownDebug = transformCooldown;
    }


    public float GetTransformCooldownRemaining()
    {
        transformationCoolDownDebug = Mathf.Max(0, transformCooldown - (Time.time - lastTransformEndTime));
        return Mathf.Max(0, transformCooldown - (Time.time - lastTransformEndTime));
    }

    public int GetCurrentFormIndex()
    {
        return currentFormIndex;
    }

    public float GetCurrentTransformationDurationRemaining()
    {
        if (currentFormIndex == 0) return 0f; // Not transformed
        transformationDurationDebug = Mathf.Max(0, transformDuration - (Time.time - transformStartTime));
        return Mathf.Max(0, transformDuration - (Time.time - transformStartTime));
    }

    // Getter for velocity so RaycastSensor can read it
    public Vector3 GetVelocity()
    {
        return velocity;
    }

    public Vector3 GetAngularVelocity()
    {
        return angularVelocity;
    }

    public void ResetTimes()
    {
        transformationCoolDownDebug = 0f;
        transformationDurationDebug = 0f;
        lastTransformEndTime = -Mathf.Infinity;
        transformStartTime = -Mathf.Infinity;
    }
}
