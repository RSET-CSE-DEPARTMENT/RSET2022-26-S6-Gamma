using UnityEngine;
using TMPro;

public class ProximityChatMessage : MonoBehaviour
{
    public TextMeshProUGUI textField;

    [Header("Lifetime Settings")]
    public float lifetime = 10f;       // Increased from 5 to 10 seconds
    public float fadeDuration = 1f;

    private CanvasGroup canvasGroup;
    private float timer;
    private bool isFading = false;

    void Awake()
    {
        canvasGroup = GetComponent<CanvasGroup>();
        if (canvasGroup == null)
        {
            canvasGroup = gameObject.AddComponent<CanvasGroup>();
        }
    }

    public void Setup(string playerName, string message, Color nameColor)
    {
        if (textField == null)
        {
            Debug.LogError("TextMeshProUGUI textField is not assigned on ProximityChatMessage!");
            return;
        }

        // Escape any existing rich text tags in the message to prevent injection
        string escapedMessage = message.Replace("<", "\\<").Replace(">", "\\>");

        // Format: colored name + message
        textField.text = $"<color=#{ColorUtility.ToHtmlStringRGB(nameColor)}>{playerName}</color>: {escapedMessage}";

        timer = lifetime;
        canvasGroup.alpha = 1f;
        isFading = false;
    }

    void Update()
    {
        if (timer > 0)
        {
            timer -= Time.deltaTime;

            // Start fading when timer reaches fade duration threshold
            if (timer <= fadeDuration && !isFading)
            {
                isFading = true;
            }
        }

        if (isFading)
        {
            canvasGroup.alpha = Mathf.Max(0, timer / fadeDuration);

            if (canvasGroup.alpha <= 0)
            {
                Destroy(gameObject);
            }
        }
    }
}