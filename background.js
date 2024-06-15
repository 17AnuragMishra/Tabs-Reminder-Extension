chrome.runtime.onStartup.addListener(function () {
    pendingTabs.forEach(tab => {
        if (tab.reminder.type !== 'none') {
            const notificationOptions = {
                type: 'basic',
                iconUrl: 'icon.png',
                title: `Reminder: ${tab.title}`,
                message: `This tab has a ${tab.reminder.type} reminder.`
            };
            chrome.notifications.create('', notificationOptions);
        }
    });
});