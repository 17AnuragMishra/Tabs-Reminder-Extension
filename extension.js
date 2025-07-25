const CONFIG = {
    BACKEND_URL: 'http://localhost:5000',
};

let authToken = null;
let currentUser = null;
let pendingTabs = [];
let activeEditIndex = -1;
let activeReminderIndex = -1;

const navbarRight = document.getElementById('navbar-right');
const authModal = document.getElementById('auth-modal');
const closeAuthModal = document.getElementById('close-auth-modal');
const authForm = document.getElementById('auth-form');
const authModalTitle = document.getElementById('auth-modal-title');
const authNameInput = document.getElementById('auth-name');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const switchAuthMode = document.getElementById('switch-auth-mode');
const authError = document.getElementById('auth-error');
const addTabBtn = document.getElementById('add-tab-btn');

let isLoginMode = true;

// --- Persistent Auth ---
async function saveAuthState() {
    await chrome.storage.local.set({ authToken, currentUser });
}
async function loadAuthState() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['authToken', 'currentUser'], (result) => {
            authToken = result.authToken || null;
            currentUser = result.currentUser || null;
            resolve();
        });
    });
}
async function clearAuthState() {
    await chrome.storage.local.remove(['authToken', 'currentUser']);
}

// --- Navbar ---
function showNavbar() {
    navbarRight.innerHTML = '';
    if (currentUser && authToken) {
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.textContent = (currentUser.email[0] || '?').toUpperCase();
        navbarRight.appendChild(avatar);

        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'navbar-btn';
        logoutBtn.textContent = 'Logout';
        logoutBtn.onclick = () => {
            logout();
        };
        navbarRight.appendChild(logoutBtn);
    } else {
        const signinBtn = document.createElement('button');
        signinBtn.className = 'navbar-btn';
        signinBtn.textContent = 'Sign In / Sign Up';
        signinBtn.onclick = () => {
            openAuthModal();
        };
        navbarRight.appendChild(signinBtn);
    }
}

function openAuthModal() {
    authModal.style.display = 'flex';
    isLoginMode = true;
    updateAuthModal();
}
function closeAuthModalFn() {
    authModal.style.display = 'none';
    authError.textContent = '';
    authForm.reset();
}
closeAuthModal.onclick = closeAuthModalFn;
window.onclick = function(event) {
    if (event.target === authModal) closeAuthModalFn();
};

switchAuthMode.onclick = function() {
    isLoginMode = !isLoginMode;
    updateAuthModal();
};
function updateAuthModal() {
    if (isLoginMode) {
        authModalTitle.textContent = 'Login';
        authSubmitBtn.textContent = 'Login';
        switchAuthMode.textContent = "Don't have an account? Register";
        authNameInput.style.display = 'none';
    } else {
        authModalTitle.textContent = 'Register';
        authSubmitBtn.textContent = 'Register';
        switchAuthMode.textContent = 'Already have an account? Login';
        authNameInput.style.display = 'block';
    }
    authError.textContent = '';
    authForm.reset();
}

authForm.onsubmit = async function(e) {
    e.preventDefault();
    authError.textContent = '';
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;
    const name = authNameInput.value.trim();
    try {
        let url, body;
        if (isLoginMode) {
            url = CONFIG.BACKEND_URL + '/api/auth/login';
            body = { email, password };
        } else {
            url = CONFIG.BACKEND_URL + '/api/auth/register';
            body = { name, email, password };
        }
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Auth failed');
        authToken = data.token;
        currentUser = data.user;
        await saveAuthState();
        closeAuthModalFn();
        showNavbar();
        await fetchTabsFromBackend();
        updatePendingTabsList();
    } catch (err) {
        authError.textContent = err.message;
    }
};

async function logout() {
    authToken = null;
    currentUser = null;
    pendingTabs = [];
    await clearAuthState();
    showNavbar();
    updatePendingTabsList();
}

// --- Tabs Backend API ---
async function fetchTabsFromBackend() {
    if (!authToken) {
        pendingTabs = [];
        await chrome.storage.local.set({ pendingTabs: [] });
        return;
    }
    try {
        const res = await fetch(CONFIG.BACKEND_URL + '/api/tabs', {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (res.status === 401) {
            await logout();
            return;
        }
        const data = await res.json();
        console.log("data", data);
        pendingTabs = Array.isArray(data) ? data : [];
        // Sync with background script
        await chrome.storage.local.set({ pendingTabs });
        console.log("pendingTabs", pendingTabs);
    } catch (err) {
        pendingTabs = [];
        await chrome.storage.local.set({ pendingTabs: [] });
    }
}
async function addTabToBackend(tabData) {
    try {
        const res = await fetch(CONFIG.BACKEND_URL + '/api/tabs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
            },
            body: JSON.stringify(tabData)
        });
        if (res.status === 401) {
            await logout();
            return null;
        }
        return await res.json();
    } catch (err) {
        return null;
    }
}
async function updateTabInBackend(tabId, tabData) {
    try {
        const res = await fetch(CONFIG.BACKEND_URL + '/api/tabs/' + tabId, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
            },
            body: JSON.stringify(tabData)
        });
        if (res.status === 401) {
            await logout();
            return null;
        }
        return await res.json();
    } catch (err) {
        return null;
    }
}
async function deleteTabFromBackend(tabId) {
    try {
        const res = await fetch(CONFIG.BACKEND_URL + '/api/tabs/' + tabId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (res.status === 401) {
            await logout();
            return false;
        }
        return true;
    } catch (err) {
        return false;
    }
}

// --- UI Logic ---
function showEmptyState() {
    const emptyMessage = document.getElementById('empty-message');
    const authPromo = document.getElementById('auth-promo');
    if (!authToken || !currentUser) {
        emptyMessage.innerHTML = 'You must <b>sign in</b> to save and view your tabs.';
        emptyMessage.style.display = 'block';
        authPromo.style.display = 'block';
        authPromo.innerHTML = `
            <div>Sign in or register to sync your tabs securely and access them anywhere.</div>
            <button class="auth-promo-btn" onclick="openAuthModal()">Sign In / Sign Up</button>
        `;
    } else {
        emptyMessage.innerHTML = 'No reminders yet. <br> <b>Click "Add Current Tab" to save a tab for later!</b>';
        emptyMessage.style.display = 'block';
        authPromo.style.display = 'none';
    }
}
function hideEmptyState() {
    document.getElementById('empty-message').style.display = 'none';
    document.getElementById('auth-promo').style.display = 'none';
}

function setTabActionsEnabled(enabled) {
    addTabBtn.disabled = !enabled;
    addTabBtn.style.opacity = enabled ? 1 : 0.5;
}

async function handleAddTab() {
    if (!authToken || !currentUser) {
        openAuthModal();
        return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
        const currentTab = tabs[0];
        if (pendingTabs.some(tab => tab.url === currentTab.url)) {
            alert("This tab or link already exists in the list.");
            return;
        }
        const tabData = {
            title: currentTab.title,
            url: currentTab.url
        };
        const newTab = await addTabToBackend(tabData);
        if (newTab) {
            await fetchTabsFromBackend();
            updatePendingTabsList();
        }
    });
}

function updatePendingTabsList() {
    const pendingTabsList = document.getElementById("pending-tabs-list");
    pendingTabsList.innerHTML = "";

    if (!authToken || !currentUser) {
        setTabActionsEnabled(false);
        showEmptyState();
        return;
    }
    setTabActionsEnabled(true);
    if (pendingTabs.length === 0) {
        showEmptyState();
        return;
    } else {
        hideEmptyState();
    }

    pendingTabs.forEach((tab, index) => {
        const listItem = document.createElement("li");
        listItem.className = "reminder-card";

        // --- Card Header ---
        const cardHeader = document.createElement("div");
        cardHeader.className = "card-header";

        // Tab name/link
        const tabLink = document.createElement("a");
        tabLink.href = tab.url;
        tabLink.target = "_blank";
        tabLink.className = "card-title-link";
        tabLink.title = tab.title;
        tabLink.textContent = tab.title.length > 40 ? tab.title.substring(0, 40) + "..." : tab.title;
        cardHeader.appendChild(tabLink);

        // Edit/Delete icons
        const cardActions = document.createElement("div");
        cardActions.className = "card-actions";

        // Edit icon
        const editBtn = document.createElement("button");
        editBtn.className = "icon-btn edit-btn";
        editBtn.title = "Edit";
        editBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 13.5V16h2.5l7.06-7.06-2.5-2.5L4 13.5zM17.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.76 3.76 1.83-1.83z" fill="currentColor"/></svg>';
        editBtn.addEventListener("click", function () {
            if (activeEditIndex === -1) {
                activeEditIndex = index;
                editTab(index);
            } else {
                alert("Please save or cancel the active edit before editing another tab.");
            }
        });
        cardActions.appendChild(editBtn);

        // Delete icon
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "icon-btn delete-btn";
        deleteBtn.title = "Delete";
        deleteBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 7v7a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 10v3M11 10v3M4 7h12M8 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        deleteBtn.addEventListener("click", async function () {
            if (activeEditIndex === index) {
                alert("Please save or cancel the active edit before deleting this tab.");
                return;
            }
            await deleteTabFromBackend(tab._id);
            await fetchTabsFromBackend();
            updatePendingTabsList();
        });
        cardActions.appendChild(deleteBtn);

        cardHeader.appendChild(cardActions);
        listItem.appendChild(cardHeader);

        // --- Card Footer (actions) ---
        const cardFooter = document.createElement("div");
        cardFooter.className = "card-footer";

        // Mark as Done
        const doneBtn = document.createElement("button");
        doneBtn.textContent = "Mark as Done";
        doneBtn.className = "done-btn";
        doneBtn.addEventListener("click", async function () {
            await deleteTabFromBackend(tab._id);
            await fetchTabsFromBackend();
            updatePendingTabsList();
        });
        cardFooter.appendChild(doneBtn);

        // Reminder logic
        if (tab.reminderTime) {
            const timeLabel = document.createElement("span");
            timeLabel.className = "reminder-time-label";
            // Render in IST
            const istString = new Date(tab.reminderTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
            timeLabel.textContent = `${istString}`;
            cardFooter.appendChild(timeLabel);

            const editReminderBtn = document.createElement("button");
            editReminderBtn.textContent = "Edit Reminder";
            editReminderBtn.className = "reminder-btn";
            editReminderBtn.addEventListener("click", function () {
                activeReminderIndex = index;
                updatePendingTabsList();
            });
            cardFooter.appendChild(editReminderBtn);

            const removeReminderBtn = document.createElement("button");
            removeReminderBtn.textContent = "Remove Reminder";
            removeReminderBtn.className = "reminder-btn remove-reminder-btn";
            removeReminderBtn.addEventListener("click", async function () {
                // Immediately update UI
                tab.reminderTime = null;
                updatePendingTabsList();
                await updateTabInBackend(tab._id, { reminderTime: null });
                await fetchTabsFromBackend();
            });
            cardFooter.appendChild(removeReminderBtn);

            // If editing this reminder, show the input
            if (activeReminderIndex === index) {
                const reminderInput = document.createElement("input");
                reminderInput.type = "datetime-local";
                reminderInput.className = "reminder-input";
                reminderInput.value = tab.reminderTime ? new Date(tab.reminderTime).toISOString().slice(0, 16) : "";
                reminderInput.addEventListener("change", async function () {
                    const reminderTime = new Date(reminderInput.value).getTime();
                    await updateTabInBackend(tab._id, { reminderTime });
                    await fetchTabsFromBackend();
                    activeReminderIndex = -1;
                    updatePendingTabsList();
                });
                cardFooter.appendChild(reminderInput);

                const cancelBtn = document.createElement("button");
                cancelBtn.textContent = "Cancel";
                cancelBtn.className = "reminder-btn cancel-reminder-btn";
                cancelBtn.addEventListener("click", function () {
                    activeReminderIndex = -1;
                    updatePendingTabsList();
                });
                cardFooter.appendChild(cancelBtn);
            }
        } else if (activeReminderIndex === index) {
            const reminderInput = document.createElement("input");
            reminderInput.type = "datetime-local";
            reminderInput.className = "reminder-input";
            reminderInput.value = tab.reminderTime ? new Date(tab.reminderTime).toISOString().slice(0, 16) : "";
            reminderInput.addEventListener("change", async function () {
                const reminderTime = new Date(reminderInput.value).getTime();
                await updateTabInBackend(tab._id, { reminderTime });
                await fetchTabsFromBackend();
                activeReminderIndex = -1;
                updatePendingTabsList();
            });
            cardFooter.appendChild(reminderInput);

            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "Cancel";
            cancelBtn.className = "reminder-btn cancel-reminder-btn";
            cancelBtn.addEventListener("click", function () {
                activeReminderIndex = -1;
                updatePendingTabsList();
            });
            cardFooter.appendChild(cancelBtn);
        } else {
            const setReminderBtn = document.createElement("button");
            setReminderBtn.textContent = "Set Reminder";
            setReminderBtn.className = "reminder-btn";
            setReminderBtn.addEventListener("click", function () {
                activeReminderIndex = index;
                updatePendingTabsList();
            });
            cardFooter.appendChild(setReminderBtn);
        }

        listItem.appendChild(cardFooter);
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
    saveBtn.addEventListener("click", async function () {
        await updateTabInBackend(tab._id, { ...tab, title: titleInput.value });
        await fetchTabsFromBackend();
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

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", async function () {
    await loadAuthState();
    showNavbar();
    await fetchTabsFromBackend();
    updatePendingTabsList();
    addTabBtn.onclick = handleAddTab;
});
