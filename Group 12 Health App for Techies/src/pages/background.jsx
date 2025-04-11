// background.js - Tracks time and manages state
  let screenTimeData = {
    today: 0,
    startTime: null,
    workMode: false,
    lastSync: null,
    daily: {}
  };
  
  // Initialize when extension is installed or updated
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['screenTimeData'], (result) => {
      if (result.screenTimeData) {
        screenTimeData = result.screenTimeData;
        
        // Reset counters if it's a new day
        const today = new Date().toISOString().split('T')[0];
        if (!screenTimeData.daily || !screenTimeData.daily[today]) {
          screenTimeData.today = 0;
          if (!screenTimeData.daily) screenTimeData.daily = {};
          screenTimeData.daily[today] = 0;
          saveData();
        }
      } else {
        // Initialize with default values
        const today = new Date().toISOString().split('T')[0];
        screenTimeData = {
          today: 0,
          startTime: null,
          workMode: false,
          lastSync: null,
          daily: {
            [today]: 0
          }
        };
        saveData();
      }
    });
    
    // Set up daily reset alarm
    chrome.alarms.create('dailyReset', {
      periodInMinutes: 24 * 60, // Daily
      when: getNextMidnight()
    });
    
    // Set up sync alarm (every 5 minutes)
    chrome.alarms.create('syncData', {
      periodInMinutes: 5
    });
  });
  
  // Listen for alarms
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'dailyReset') {
      resetDailyCounter();
    } else if (alarm.name === 'syncData') {
      syncWithDashboard();
    }
  });
  
  // Listen for tab activity
  chrome.tabs.onActivated.addListener(() => {
    startTimer();
  });
  
  // Listen for window focus changes
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // Browser lost focus
      stopTimer();
    } else {
      // Browser gained focus
      startTimer();
    }
  });
  
  // Handle idle state changes
  chrome.idle.onStateChanged.addListener((state) => {
    if (state === 'active') {
      startTimer();
    } else {
      stopTimer();
    }
  });
  
  // Start tracking time
  function startTimer() {
    if (!screenTimeData.startTime) {
      screenTimeData.startTime = Date.now();
    }
  }
  
  // Stop tracking time and update counters
  function stopTimer() {
    if (screenTimeData.startTime) {
      const elapsed = Math.floor((Date.now() - screenTimeData.startTime) / 1000 / 60);
      screenTimeData.startTime = null;
      
      if (elapsed > 0) {
        screenTimeData.today += elapsed;
        
        const today = new Date().toISOString().split('T')[0];
        if (!screenTimeData.daily[today]) {
          screenTimeData.daily[today] = 0;
        }
        screenTimeData.daily[today] += elapsed;
        
        saveData();
      }
    }
  }
  
  // Reset counter at midnight
  function resetDailyCounter() {
    stopTimer(); // Stop current timer if running
    
    const today = new Date().toISOString().split('T')[0];
    screenTimeData.today = 0;
    screenTimeData.daily[today] = 0;
    
    saveData();
    
    // Set up next alarm
    chrome.alarms.create('dailyReset', {
      when: getNextMidnight()
    });
  }
  
  // Calculate next midnight
  function getNextMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime();
  }
  
  // Save data to storage
  function saveData() {
    chrome.storage.local.set({ screenTimeData });
  }
  
  // Sync data with the dashboard
  function syncWithDashboard() {
    stopTimer(); // Update counters before syncing
    
    // Find any dashboard tabs that are open
    chrome.tabs.query({ url: ["*://localhost/*", "*://yourdashboarddomain.com/*"] }, (tabs) => {
      if (tabs.length > 0) {
        // Dashboard is open, send data
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: "updateScreenTime",
            data: {
              today: screenTimeData.today,
              workMode: screenTimeData.workMode,
              history: formatHistoryData()
            }
          });
        });
        
        screenTimeData.lastSync = new Date().toISOString();
        saveData();
      }
    });
    
    startTimer(); // Restart timer if browser is active
  }
  
  // Format history data for dashboard
  function formatHistoryData() {
    return Object.keys(screenTimeData.daily).map(date => ({
      date,
      minutes: screenTimeData.daily[date],
      workMode: screenTimeData.workMode
    }));
  }
  
  // Listen for messages from popup or content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getScreenTime") {
      stopTimer(); // Update counters
      sendResponse({
        today: screenTimeData.today,
        workMode: screenTimeData.workMode,
        lastSync: screenTimeData.lastSync,
        history: formatHistoryData()
      });
      startTimer(); // Restart timer
    } else if (message.action === "setWorkMode") {
      screenTimeData.workMode = message.workMode;
      saveData();
      syncWithDashboard();
      sendResponse({ success: true });
    } else if (message.action === "syncNow") {
      syncWithDashboard();
      sendResponse({ success: true });
    }
    return true;
  });
  
  
 
  
 