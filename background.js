chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('checkReminders', { periodInMinutes: 1 });
  });
  
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkReminders') {
      checkReminders();
    }
  });
  
  function checkReminders() {
    chrome.storage.local.get('pendingTabs', (result) => {
      const now = new Date().getTime();
      const pendingTabs = result.pendingTabs || [];
  
      pendingTabs.forEach((tab, index) => {
        if (tab.reminderTime && now >= tab.reminderTime) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'Tab Reminder',
            message: `Time to check this tab: ${tab.title}`
          });
  
          // Remove the reminder after notification
          delete pendingTabs[index].reminderTime;
          chrome.storage.local.set({ pendingTabs: pendingTabs });
        }
      });
    });
  }
