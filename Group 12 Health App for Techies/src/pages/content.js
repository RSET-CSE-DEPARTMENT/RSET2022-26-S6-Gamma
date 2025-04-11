 // content.js - Communicates with the dashboard page
  // Wait for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateScreenTime") {
      // Send data to the dashboard via a custom event
      const event = new CustomEvent('screenTimeUpdated', { 
        detail: message.data 
      });
      document.dispatchEvent(event);
      sendResponse({ success: true });
    }
    return true;
  });
  
  // Listen for page ready event
  window.addEventListener('load', () => {
    // Let the dashboard know the extension is present
    const event = new CustomEvent('screenTimeExtensionInstalled');
    document.dispatchEvent(event);
    
    // Request an immediate sync
    chrome.runtime.sendMessage({ action: "syncNow" });
  });