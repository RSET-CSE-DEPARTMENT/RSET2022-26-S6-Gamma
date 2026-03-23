using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Unity.Netcode;

public class PlayerHUD : NetworkBehaviour
{
    [Header("HUD Root")]
    [SerializeField] private GameObject hudPanel;
    [SerializeField] private Canvas playerCanvas; // ADD THIS — drag the full Canvas here

    [Header("Health (Bottom Center Bar)")]
    [SerializeField] private Image healthBarFill;
    [SerializeField] private TextMeshProUGUI healthText;
    [SerializeField] private float maxHealth = 100f;

    [Header("Ammo (Top Right Box)")]
    [SerializeField] private TextMeshProUGUI ammoText;
    [SerializeField] private TextMeshProUGUI reloadText;

    [Header("Inventory (Right Side of Bottom Bar)")]
    [SerializeField] private GameObject inventoryGroup;
    [SerializeField] private TextMeshProUGUI itemNameText;
    [SerializeField] private TextMeshProUGUI holdHintText;
 
    // Component refs
    private PlayerHealthHandler healthHandler;
    private ThirdPersonShooterController shooterController;
    private PlayerInventory playerInventory;

    // Inventory change tracking
    private bool lastHoldingState = false;
    private string lastItemName = "";

    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();

        if (!IsOwner)
        {
            // Hide the entire canvas for non-owners
            if (playerCanvas != null) playerCanvas.enabled = false;
            if (hudPanel != null) hudPanel.SetActive(false);
            enabled = false;
            return;
        }

        // Owner — make sure canvas is on
        if (playerCanvas != null) playerCanvas.enabled = true;

        healthHandler = GetComponent<PlayerHealthHandler>();
        shooterController = GetComponent<ThirdPersonShooterController>();
        playerInventory = GetComponent<PlayerInventory>();

        if (hudPanel != null) hudPanel.SetActive(true);
        if (reloadText != null) reloadText.gameObject.SetActive(false);

        RefreshInventoryUI(force: true);
        UpdateHealthUI();
        UpdateAmmoUI();
    }


    private void Update()
    {
        UpdateHealthUI();
        UpdateAmmoUI();
        RefreshInventoryUI(force: false);
    }

    // Health 
    private void UpdateHealthUI()
    {
        if (healthHandler == null) return;

        float current = healthHandler.GetCurrentHealth();
        float pct = Mathf.Clamp01(current / maxHealth);

        if (healthBarFill != null)
        {
            // Reads the actual width of the parent (HealthBarBG) automatically
            float fullWidth = healthBarFill.rectTransform.parent.GetComponent<RectTransform>().rect.width - 4f; // -4 for inset
            Vector2 size = healthBarFill.rectTransform.sizeDelta;
            size.x = fullWidth * pct;
            healthBarFill.rectTransform.sizeDelta = size;
        }

        if (healthText != null)
            healthText.text = $"{Mathf.CeilToInt(current)}  /  {Mathf.CeilToInt(maxHealth)}";
    }

    // Ammo 
    private void UpdateAmmoUI()
    {
        if (shooterController == null) return;

        bool reloading = shooterController.IsReloading();
        int current = shooterController.GetCurrentAmmo();
        int mag = shooterController.GetMagazineSize();

        if (ammoText != null)
            ammoText.text = reloading ? "- - -" : $"{current}  /  {mag}";

        if (reloadText != null)
            reloadText.gameObject.SetActive(reloading);
    }

    // Inventory
    private void RefreshInventoryUI(bool force)
    {
        if (playerInventory == null) return;

        bool holding = playerInventory.IsHoldingItem();
        GameObject prefab = holding ? playerInventory.GetHeldPrefab() : null;
        string itemName = prefab != null ? prefab.name : "";

        // Only redraw if something changed (or forced on spawn)
        if (!force && holding == lastHoldingState && itemName == lastItemName) return;

        lastHoldingState = holding;
        lastItemName = itemName;

        if (holding && prefab != null)
        {
            if (itemNameText != null) itemNameText.text = itemName;
            if (holdHintText != null) holdHintText.text = "[Q] Drop";
        }
        else
        {
            if (itemNameText != null) itemNameText.text = "Empty";
            if (holdHintText != null) holdHintText.text = "[E] Pick Up";
        }
    }
}
