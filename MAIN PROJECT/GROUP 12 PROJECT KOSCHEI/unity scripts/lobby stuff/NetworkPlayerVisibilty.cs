using Unity.Netcode;
using UnityEngine;
using UnityEngine.SceneManagement;

public class NetworkPlayerVisibility : NetworkBehaviour
{
    [SerializeField] private GameObject visualRoot; // Drag your character model/GFX here
    [SerializeField] private MonoBehaviour[] scriptsToDisable; // Drag Movement/Input scripts here
    [SerializeField] private CharacterController characterController; // Optional: Drag if you use one

    private void Start()
    {
        // Subscribe to scene changes
        SceneManager.activeSceneChanged += OnSceneChanged;
        
        // Run check immediately on spawn
        CheckVisibility(SceneManager.GetActiveScene());
    }

    public override void OnDestroy()
    {
        // Always unsubscribe to prevent errors
        SceneManager.activeSceneChanged -= OnSceneChanged;
        base.OnDestroy();
    }

    private void OnSceneChanged(Scene oldScene, Scene newScene)
    {
        CheckVisibility(newScene);
    }

    private void CheckVisibility(Scene scene)
    {
        // Change "GameScene" to the exact name of your gameplay scene
        bool isGameScene = (scene.name == "Scene_A");

        // 1. Toggle Visuals
        if (visualRoot != null) 
            visualRoot.SetActive(isGameScene);

        // 2. Toggle Scripts (Movement, Input, etc.)
        foreach (var script in scriptsToDisable)
        {
            if (script != null) script.enabled = isGameScene;
        }

        // 3. Toggle Physics/Controller
        if (characterController != null) 
            characterController.enabled = isGameScene;

        // 4. Force position reset if entering game (Optional)
        if (isGameScene && IsOwner)
        {
            transform.position = new Vector3(0, 1, 0); // Spawn point
        }
    }
}