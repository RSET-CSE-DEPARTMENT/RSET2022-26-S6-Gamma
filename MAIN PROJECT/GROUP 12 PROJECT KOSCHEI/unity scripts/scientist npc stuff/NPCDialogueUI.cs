using UnityEngine;
using TMPro;

// Place this on the NPCDialogueCanvas scene object (not network-spawned).
public class NPCDialogueUI : MonoBehaviour
{
    public static NPCDialogueUI Instance;

    [Header("Dialogue Panel")]
    public GameObject dialoguePanel;
    public TextMeshProUGUI dialogueText;

    [Header("Interact Hint (optional)")]
    [Tooltip("Small label shown when player is in range but dialogue hasn't started.")]
    public GameObject hintPanel;
    public TextMeshProUGUI hintText;

    // True while the local player is within range of an NPC
    public bool IsNearNPC { get; set; } = false;

    void Awake()
    {
        Instance = this;
        HideDialogue();
    }

    public void ShowLine(string text)
    {
        if (dialoguePanel == null || dialogueText == null) return;
        HideHint();
        dialoguePanel.SetActive(true);
        dialogueText.text = text;
    }

    public void ShowInteractHint()
    {
        if (hintPanel == null) return;
        hintPanel.SetActive(true);
        if (hintText != null) hintText.text = "[E] Talk";
    }

    public void HideDialogue()
    {
        if (dialoguePanel != null) dialoguePanel.SetActive(false);
        HideHint();
    }

    private void HideHint()
    {
        if (hintPanel != null) hintPanel.SetActive(false);
    }
}