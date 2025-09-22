document.addEventListener('DOMContentLoaded', () => {
    // --- TAB SWITCHING LOGIC ---
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.getAttribute('data-tab');

            // Update active state on tab links
            tabLinks.forEach(item => item.classList.remove('active'));
            link.classList.add('active');

            // Show the correct tab pane
            tabPanes.forEach(pane => {
                if (pane.id === tabId) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
        });
    });

    // --- AUTHENTICATION & INITIALIZATION ---
    const token = localStorage.getItem('vibescape-token');
    if (!token) {
        window.location.href = '/index.html'; // Redirect if not logged in
        return;
    }

    // --- DOM Elements ---
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const profileImgHeader = document.getElementById('profile-img-header');
    const profilePicPreview = document.getElementById('profile-pic-preview');
    const profilePicUpload = document.getElementById('profile-pic-upload');
    const removePicBtn = document.getElementById('remove-pic-btn');

    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    
    // Toggles
    const autoplayToggle = document.getElementById('autoplay-toggle');
    const canvasToggle = document.getElementById('canvas-toggle');
    const publicPlaylistsToggle = document.getElementById('public-playlists-toggle');

    // Danger Zone
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');

    // Modal
    const modal = document.getElementById('confirmation-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');

    // --- API HELPER FUNCTION ---
    const fetchAPI = async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        };
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) { // If token is expired or invalid
            handleLogout();
            throw new Error('Unauthorized');
        }
        return response;
    };

    // --- PROFILE PICTURE LOGIC ---
    profilePicUpload.addEventListener('change', () => {
        const file = profilePicUpload.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newPicUrl = e.target.result;
                profilePicPreview.src = newPicUrl;
                // In a real app, you would now enable a "Save" button and
                // upload this file data to the server.
                console.log("Image ready for upload.");
            };
            reader.readAsDataURL(file);
        }
    });

    removePicBtn.addEventListener('click', () => {
        const defaultPic = 'https://via.placeholder.com/150';
        profilePicPreview.src = defaultPic;
        profilePicUpload.value = ''; // Clear the selected file
    });

    // --- PLAYBACK & PRIVACY SETTINGS LOGIC ---
    const settings = {
        autoplay: true,
        showCanvas: true,
        publicPlaylists: true
    };

    const saveSettings = () => {
        localStorage.setItem('vibescape-settings', JSON.stringify(settings));
        console.log("Settings saved:", settings);
    };

    const loadSettings = () => {
        const saved = JSON.parse(localStorage.getItem('vibescape-settings'));
        if (saved) {
            Object.assign(settings, saved);
        }
        // Sync toggles with loaded settings
        autoplayToggle.checked = settings.autoplay;
        canvasToggle.checked = settings.showCanvas;
        publicPlaylistsToggle.checked = settings.publicPlaylists;
    };

    autoplayToggle.addEventListener('change', () => { settings.autoplay = autoplayToggle.checked; saveSettings(); });
    canvasToggle.addEventListener('change', () => { settings.showCanvas = canvasToggle.checked; saveSettings(); });
    publicPlaylistsToggle.addEventListener('change', () => { settings.publicPlaylists = publicPlaylistsToggle.checked; saveSettings(); });

    // --- DATA LOADING & FORM SUBMISSIONS ---
    const loadUserData = async () => {
        try {
            const response = await fetchAPI('/api/user/profile');
            if (!response.ok) throw new Error('Failed to fetch user data.');
            
            const user = await response.json();
            usernameInput.value = user.username;
            emailInput.value = user.email;
            
            // Assuming user.profilePic is a field in your schema
            // profileImgHeader.src = user.profilePic || 'https://via.placeholder.com/40';
            // profilePicPreview.src = user.profilePic || 'https://via.placeholder.com/150';
        } catch (error) {
            console.error('Error loading user data:', error);
            if (error.message === 'Unauthorized') {
                 alert('Your session has expired. Please log in again.');
            }
        }
    };
    
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // NOTE: Full implementation would require FormData for image uploads.
        // This example saves text fields only.
        const updatedData = {
            username: usernameInput.value,
            email: emailInput.value,
        };
        try {
            const response = await fetchAPI('/api/user/profile', {
                method: 'PUT',
                body: JSON.stringify(updatedData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            alert(result.message);
        } catch (error) {
            alert(`Error updating profile: ${error.message}`);
        }
    });

    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        try {
            const response = await fetchAPI('/api/user/change-password', {
                method: 'PUT',
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            alert(result.message);
            passwordForm.reset();
        } catch (error) {
            alert(`Error changing password: ${error.message}`);
        }
    });

    // --- MODAL AND DANGER ZONE LOGIC ---
    let confirmAction = null; // A variable to hold the function to run on confirmation

    const openModal = (title, text, action) => {
        modalTitle.textContent = title;
        modalText.textContent = text;
        confirmAction = action; // Set the function to be executed
        modal.style.display = 'flex';
    };

    const closeModal = () => {
        modal.style.display = 'none';
        confirmAction = null; // Clear the action
    };

    modalCancelBtn.addEventListener('click', closeModal);
    modalConfirmBtn.addEventListener('click', () => {
        if (typeof confirmAction === 'function') {
            confirmAction(); // Execute the stored function
        }
        closeModal();
    });

    clearHistoryBtn.addEventListener('click', () => {
        openModal(
            'Clear Listening History?',
            'This will permanently delete all your listening data. This action cannot be undone.',
            () => {
                // This is where you would make the API call to the backend
                console.log("Executing action: Clear History");
                // await fetchAPI('/api/user/history', { method: 'DELETE' });
                alert("Listening history has been cleared. (Simulated)");
            }
        );
    });
    
    deleteAccountBtn.addEventListener('click', () => {
        openModal(
            'Delete Your Account?',
            'Your account, playlists, and all data will be permanently erased. Are you absolutely sure?',
            () => {
                // This is where you would make the API call to the backend
                console.log("Executing action: Delete Account");
                // await fetchAPI('/api/user/account', { method: 'DELETE' });
                alert("Account deleted. Logging you out. (Simulated)");
                handleLogout();
            }
        );
    });

    // --- LOGOUT FUNCTION ---
    const handleLogout = () => {
        localStorage.clear(); // Clears token, user settings, etc.
        window.location.href = '/index.html';
    };
    
    // Attach logout to the header link
    const logoutLink = document.getElementById('logout-link');
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });

    // --- INITIAL PAGE LOAD ---
    loadUserData();
    loadSettings();
});