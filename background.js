 chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('checkReminders', { periodInMinutes: 1 });
});

// Check reminders on browser startup as well
chrome.runtime.onStartup.addListener(() => {
    checkReminders();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkReminders') {
        checkReminders();
    }
});

// Handle notification click to open the tab
chrome.notifications.onClicked.addListener((notificationId) => {
    // notificationId is the tab URL
    if (notificationId.startsWith('tab-reminder-')) {
        const url = notificationId.replace('tab-reminder-', '');
        chrome.tabs.create({ url });
    }
});

function checkReminders() {
    chrome.storage.local.get('pendingTabs', (result) => {
        const now = new Date().getTime();
        let pendingTabs = result.pendingTabs || [];
        let updatedTabs = [];

        pendingTabs.forEach((tab) => {
            if (tab.reminderTime && now >= tab.reminderTime) {
                chrome.notifications.create(
                    'tab-reminder-' + tab.url, // Use URL as notificationId
                    {
                        type: 'basic',
                        iconUrl: 'icons/icon-48.png',
                        title: 'Tab Reminder',
                        message: `Time to check this tab: ${tab.title}`
                    }
                );
                // Do not add to updatedTabs (removes it)
            } else {
                updatedTabs.push(tab);
            }
        });

        // Update storage only if changed
        if (updatedTabs.length !== pendingTabs.length) {
            chrome.storage.local.set({ pendingTabs: updatedTabs });
        }
    });
}
