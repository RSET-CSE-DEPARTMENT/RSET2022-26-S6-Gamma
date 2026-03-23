using UnityEngine;

public class PlayerFeatures : MonoBehaviour
{
    public GameManagerFinal gameManager;

    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.Escape) && gameManager.onMenu == false)
            gameManager.uiController.TogglePauseMenu();

    }

    private void OnCollisionEnter(Collision collision)
    {
        if (collision.transform.parent != null && collision.transform.parent.name == "Hider")
        {
            //Destroy(collision.transform.parent.gameObject);
            collision.transform.parent.gameObject.SetActive(false);
            gameManager.HiderCaught();
        }
    }
}
