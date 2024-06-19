let pendingTabs = [];
let activeEditIndex = -1;

document.addEventListener("DOMContentLoaded", function () {
    const addTabBtn = document.getElementById("add-tab-btn");
    addTabBtn.addEventListener("click", function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const currentTab = tabs[0];
            const exists = pendingTabs.some(tab => tab.url === currentTab.url);
            if (exists) {
                alert("This tab or link already exists in the list.");
                return;
            }

            const tabData = {
                title: currentTab.title,
                url: currentTab.url
            };

            pendingTabs.push(tabData);
            chrome.storage.local.set({ pendingTabs: pendingTabs });
            updatePendingTabsList();
        });
    });

    chrome.storage.local.get("pendingTabs", function (result) {
        if (result.pendingTabs) {
            pendingTabs = result.pendingTabs;
            updatePendingTabsList();
        }
    });
});
function showNotification(title, message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: title,
        message: message
    });
}

function updatePendingTabsList() {
    const pendingTabsList = document.getElementById("pending-tabs-list");
    pendingTabsList.innerText = "";
    pendingTabs.forEach((tab, index) => {
        const listItem = document.createElement("li");
        const tabLink = document.createElement("a");
        tabLink.href = tab.url;
        tabLink.target = "_blank";
        tabLink.textContent = tab.title.substring(0, 25)+"...";
        listItem.appendChild(tabLink);
        // this is what I could not implement.

        const reminderInput = document.createElement("input");
        reminderInput.type = "datetime-local";
        reminderInput.className = "reminder-input";
        reminderInput.value = tab.reminderTime ? new Date(tab.reminderTime).toISOString().slice(0, 16) : "";
        reminderInput.addEventListener("change", function () {
            const reminderTime = new Date(reminderInput.value).getTime();
            pendingTabs[index].reminderTime = reminderTime;
            chrome.storage.local.set({ pendingTabs: pendingTabs });
        });
        listItem.appendChild(reminderInput);
        
        //ends here

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.className = "edit-btn";
        editBtn.addEventListener("click", function () {
          if (activeEditIndex === -1) {
            activeEditIndex = index;
            editTab(index);
          } else {
            alert("Please save or cancel the active edit before editing another tab.");
          }
        });
        listItem.appendChild(editBtn);
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-btn";
        deleteBtn.addEventListener("click", function () {
            if (activeEditIndex === index) {
                alert("Please save or cancel the active edit before deleting this tab.");
                return;
            }
            deleteBtn.textContent = "Sure";
            deleteTab(index);
        });
        listItem.appendChild(deleteBtn);
        pendingTabsList.appendChild(listItem);
    });
}

function editTab(index) {
    const tab = pendingTabs[index];
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = tab.title;
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", function () {
        tab.title = titleInput.value;
        chrome.storage.local.set({ pendingTabs: pendingTabs });
        activeEditIndex = -1;
        updatePendingTabsList();
    });
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", function () {
        activeEditIndex = -1;
        updatePendingTabsList();
    });
    const editForm = document.createElement("form");
    editForm.appendChild(titleInput);
    editForm.appendChild(saveBtn);
    editForm.appendChild(cancelBtn);
    document.body.appendChild(editForm);
}

function deleteTab(index) {
    pendingTabs.splice(index, 1);
    chrome.storage.local.set({ pendingTabs: pendingTabs }, function() {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
        } else {
            console.log('Tab deleted and data removed from local storage');
        }
    });
    updatePendingTabsList();
}
