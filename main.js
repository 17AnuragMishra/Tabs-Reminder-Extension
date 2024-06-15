chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    tabs.forEach(function(tab) {
      var button = document.createElement("button");
      button.textContent = "Add to pending list";
      button.className = "copy_code_button";
      button.addEventListener("click", function() {
        chrome.storage.local.set({ pendingTabs: [...pendingTabs, tab] });
        chrome.storage.local.get("pendingTabs", function(result) {
          if (result.pendingTabs) {
            console.log("Reminder: You have pending tabs!");
          }
        });
      });
      chrome.tabs.sendMessage(tab.id, { action: "addButton", button: button });
    });
  });
  
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "getPendingTabs") {
      chrome.storage.local.get("pendingTabs", function(result) {
        sendResponse(result.pendingTabs);
      });
    }
  });