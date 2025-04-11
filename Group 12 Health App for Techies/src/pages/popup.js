 // popup.js - Controls the popup UI
 document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const screenTimeElement = document.getElementById('screenTime');
    const workModeToggle = document.getElementById('workMode');
    const syncButton = document.getElementById('syncButton');
    const viewButton = document.getElementById('viewButton');
    const lastSyncElement = document.getElementById('lastSync');
    
    // Load current data
    chrome.runtime.sendMessage({ action: "getScreenTime" }, (response) => {
      if (response) {
        updateUI(response);
      }
    });
    
    // Set up event listeners
    workModeToggle.addEventListener('change', () => {
      chrome.runtime.sendMessage({ 
        action: "setWorkMode", 
        workMode: workModeToggle.checked 
      });
    });
    
    syncButton.addEventListener('click', () => {
      syncButton.textContent = "Syncing...";
      chrome.runtime.sendMessage({ action: "syncNow" }, () => {
        chrome.runtime.sendMessage({ action: "getScreenTime" }, (response) => {
          updateUI(response);
          syncButton.textContent = "Sync with Dashboard";
        });
      });
    });
    
    viewButton.addEventListener('click', () => {
      chrome.tabs.create({ url: "http://localhost:3000" });
    });
    
    // Update UI with current data
    function updateUI(data) {
      // Format minutes as HH:MM
      const hours = Math.floor(data.today / 60);
      const minutes = data.today % 60;
      screenTimeElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Set work mode toggle
      workModeToggle.checked = data.workMode;
      
      // Update last sync time
      if (data.lastSync) {
        const syncDate = new Date(data.lastSync);
        lastSyncElement.textContent = `Last synced: ${syncDate.toLocaleTimeString()}`;
      } else {
        lastSyncElement.textContent = "Last synced: Never";
      }
    }
  });
  