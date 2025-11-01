// This script will be used by index.html, signup.html, and reset.html

// --- THEME TOGGLE ---
// This ensures the theme toggle works on all three pages
document.addEventListener('DOMContentLoaded', () => {

    let masterSongList = []; // The complete library of all songs from the server.
    let userData = {};       // A single object to hold all data for the LOGGED-IN user.
    const token = localStorage.getItem('vibescape-token');

    // Central API fetching function with automatic authorization
    const fetchAPI = async (url, options = {}) => {
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers };
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) { handleLogout(); throw new Error('Unauthorized'); }
        return response;
    };

    // Central logout function
    const handleLogout = () => {
        localStorage.clear(); // Clear token, theme, profile pic, etc.
        window.location.href = '/index.html';
    };

    // *** FIX 1: Function to update all profile pictures from localStorage ***
    const updateProfilePictures = (picUrl) => {
        const defaultPic = "data:image/svg+xml,..."; // Your default SVG placeholder
        const url = picUrl || localStorage.getItem('vibescape-profilePic') || defaultPic;
        document.querySelectorAll('#profile-img, #profile-pic-preview').forEach(img => {
            if (img) img.src = url;
        });
    };
    updateProfilePictures();

    const themeToggle = document.getElementById('theme-toggle');
    const applyTheme = (theme) => {
        document.body.classList.toggle('light-mode', theme === 'light');
        const icon = themeToggle ? themeToggle.querySelector('i') : null;
        if (icon) icon.classList.toggle('fa-moon', theme === 'light');
        if (icon) icon.classList.toggle('fa-sun', theme !== 'light');
    };
    const toggleTheme = () => {
        const newTheme = document.body.classList.contains('light-mode') ? 'dark' : 'light';
        localStorage.setItem('vibescape-theme', newTheme);
        applyTheme(newTheme);
    };
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    applyTheme(localStorage.getItem('vibescape-theme'));

    // --- PASSWORD VISIBILITY TOGGLE ---
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const targetId = toggle.dataset.target;
            const passwordInput = document.getElementById(targetId);
            if (passwordInput && passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggle.classList.remove('fa-eye');
                toggle.classList.add('fa-eye-slash');
            } else if (passwordInput) {
                passwordInput.type = 'password';
                toggle.classList.remove('fa-eye-slash');
                toggle.classList.add('fa-eye');
            }
        });
    });

    // --- PASSWORD VALIDATION FUNCTION ---
    function validatePassword(password) {
        // Check if password is at least 8 characters
        if (password.length < 8) {
            return "Password must be at least 8 characters long.";
        }
        
        // Check if password contains at least one letter
        if (!/[A-Za-z]/.test(password)) {
            return "Password must contain at least one letter.";
        }
        
        // Check if password contains at least one number
        if (!/[0-9]/.test(password)) {
            return "Password must contain at least one number.";
        }
        
        return null; // Password is valid
    }

    // --- SIGNUP FORM LOGIC ---
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        const messageDiv = document.getElementById('signup-message');

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent the form from reloading the page

            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Validate password strength
            const passwordError = validatePassword(password);
            if (passwordError) {
                if (messageDiv) {
                    messageDiv.textContent = passwordError;
                    messageDiv.style.color = '#dc3545'; // Red color for error
                    messageDiv.style.display = 'block';
                }
                return;
            }

            if (password !== confirmPassword) {
                if (messageDiv) {
                    messageDiv.textContent = "Passwords do not match!";
                    messageDiv.style.color = '#dc3545'; // Red color for error
                    messageDiv.style.display = 'block';
                }
                return;
            }

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                const result = await response.json();

                if (messageDiv) {
                    if (response.ok) {
                        messageDiv.textContent = result.message;
                        messageDiv.style.color = 'var(--primary-color)'; // Green/Pink for success
                        messageDiv.style.display = 'block';
                        // Optionally redirect to login after a delay
                        setTimeout(() => {
                            window.location.href = '/index.html';
                        }, 2000);
                    } else {
                        // Show error message from the server
                        messageDiv.textContent = result.error || 'An error occurred.';
                        messageDiv.style.color = '#dc3545';
                        messageDiv.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Signup fetch error:', error);
                if (messageDiv) {
                    messageDiv.textContent = 'Could not connect to the server.';
                    messageDiv.style.color = '#dc3545';
                    messageDiv.style.display = 'block';
                }
            }
        });

        // Add real-time password validation feedback
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                const password = e.target.value;
                const passwordError = validatePassword(password);
                
                if (password.length > 0 && passwordError) {
                    // Show validation error
                    if (messageDiv) {
                        messageDiv.textContent = passwordError;
                        messageDiv.style.color = '#dc3545';
                        messageDiv.style.display = 'block';
                    }
                } else if (password.length > 0 && !passwordError) {
                    // Show success message
                    if (messageDiv) {
                        messageDiv.textContent = "Password meets requirements ✓";
                        messageDiv.style.color = 'var(--primary-color)';
                        messageDiv.style.display = 'block';
                    }
                } else {
                    // Hide message when input is empty
                    if (messageDiv) {
                        messageDiv.style.display = 'none';
                    }
                }
            });
        }
    }

    // --- LOGIN FORM LOGIC ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        // Create a div for showing messages, and add it after the form's last button
        let messageDiv = document.createElement('div');
        messageDiv.style.display = 'none';
        messageDiv.style.marginTop = '1rem';
        messageDiv.style.textAlign = 'center';
        
        const signupLinkElement = loginForm.querySelector('.signup-link');
        if (signupLinkElement) {
            signupLinkElement.insertAdjacentElement('beforebegin', messageDiv);
        } else {
            loginForm.appendChild(messageDiv);
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            
            if (!emailInput || !passwordInput) {
                console.error('Email or password input not found');
                return;
            }

            const email = emailInput.value;
            const password = passwordInput.value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const result = await response.json();

                if (response.ok) {
                    // SUCCESS: Save the token and redirect
                    messageDiv.textContent = result.message;
                    messageDiv.style.color = 'var(--primary-color)';
                    messageDiv.style.display = 'block';

                    // Store the token so the user stays logged in
                    // NOTE: Using sessionStorage instead of localStorage for better security
                    sessionStorage.setItem('vibescape-token', result.token);
                    sessionStorage.setItem('vibescape-user', result.username);

                    // Redirect to the main app after a short delay
                    setTimeout(() => {
                        window.location.href = '/home.html';
                    }, 1500);

                } else {
                    // FAILURE: Show error message
                    messageDiv.textContent = result.error || 'An error occurred.';
                    messageDiv.style.color = '#dc3545'; // Red for error
                    messageDiv.style.display = 'block';
                }
            } catch (error) {
                console.error('Login fetch error:', error);
                messageDiv.textContent = 'Could not connect to the server.';
                messageDiv.style.color = '#dc3545';
                messageDiv.style.display = 'block';
            }
        });
    }
    
    // --- RESET FORM LOGIC (with improved debugging) ---
    const resetForm = document.getElementById('reset-form');
    if (resetForm) {
        const messageDiv = document.getElementById('reset-message');

        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;

            if (!email) {
                if (messageDiv) {
                    messageDiv.textContent = 'Please enter your email address.';
                    messageDiv.style.color = '#dc3545';
                    messageDiv.style.display = 'block';
                }
                return;
            }

            try {
                const response = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const result = await response.json();

                if (messageDiv) {
                    if (response.ok) {
                        // --- SUCCESS ---
                        messageDiv.textContent = result.message;
                        messageDiv.style.color = 'var(--primary-color)';
                        messageDiv.style.display = 'block';
                    } else {
                        // --- SERVER-SIDE ERROR ---
                        messageDiv.textContent = result.error || 'An error occurred.';
                        messageDiv.style.color = '#dc3545';
                        messageDiv.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Reset password fetch error:', error);
                // --- NETWORK OR FETCH ERROR ---
                if (messageDiv) {
                    messageDiv.textContent = 'Could not connect to the server.';
                    messageDiv.style.color = '#dc3545';
                    messageDiv.style.display = 'block';
                }
            }
        });
    }

    // =======================================================
    // --- SETTINGS PAGE LOGIC (Only runs on settings.html) ---
    // =======================================================
    const settingsPage = document.getElementById('settings-page');
    if (settingsPage) {

        // --- TAB SWITCHING LOGIC ---
        const tabs = document.querySelectorAll('.tab');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab).classList.add('active');
            });
        });

        // --- AUTH & DOM ELEMENTS ---
        const token = localStorage.getItem('vibescape-token');
        const usernameSpan = document.getElementById('username-span');
        const emailSpan = document.getElementById('email-span');
        const profilePicPreview = document.getElementById('profile-pic-preview');
        const profilePicInput = document.getElementById('profile-pic-input');
        const uploadBtn = document.getElementById('upload-btn');
        const removeBtn = document.getElementById('remove-btn');
        const usernameForm = document.getElementById('username-form');
        const emailForm = document.getElementById('email-form');
        const passwordForm = document.getElementById('password-form');
        const notificationsToggle = document.getElementById('notifications-toggle');
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        const autoPlayToggle = document.getElementById('auto-play-toggle');
        const highQualityToggle = document.getElementById('high-quality-toggle');
        const clearHistoryBtn = document.getElementById('clear-history');
        const deleteAccountBtn = document.getElementById('delete-account');
        const logoutBtn = document.getElementById('logout-btn');
        const modal = document.getElementById('confirmation-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalCancelBtn = document.getElementById('modal-cancel');
        const modalConfirmBtn = document.getElementById('modal-confirm');

        let confirmAction = null;

        // --- API HELPER WITH IMPROVED ERROR HANDLING ---
        const apiCall = async (endpoint, method, data) => {
            try {
                const options = {
                    method,
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                };
                if (data) options.body = JSON.stringify(data);
                
                const response = await fetch(endpoint, options);
                const result = await response.json();
                
                if (!response.ok) {
                    if (response.status === 401) {
                        // Token expired or invalid
                        alert('Session expired. Please log in again.');
                        handleLogout();
                        return null;
                    }
                    throw new Error(result.error || `HTTP ${response.status}`);
                }
                return result;
            } catch (error) {
                console.error(`API call to ${endpoint} failed:`, error);
                alert(`Error: ${error.message}`);
                return null;
            }
        };

        // --- LOGOUT FUNCTION ---
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                // *** FIX 3: Clear all localStorage on logout ***
                localStorage.clear();
                window.location.href = '/index.html';
            });
        }

        // --- PROFILE PICTURE LOGIC ---
        if (uploadBtn && profilePicInput) {
            uploadBtn.addEventListener('click', () => profilePicInput.click());
            
            profilePicInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target.result;
                    if (profilePicPreview) profilePicPreview.src = dataUrl;
                    localStorage.setItem('vibescape-profilePic', dataUrl);
                    updateProfilePictures(dataUrl);
                };
                reader.readAsDataURL(file);
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                localStorage.removeItem('vibescape-profilePic');
                updateProfilePictures(); // This will revert to the default
            });
        }

        // --- LOCAL SETTINGS (TOGGLES) ---
        const loadLocalSettings = () => {
            const settings = {
                notifications: localStorage.getItem('vibescape-notifications') === 'true',
                darkMode: localStorage.getItem('vibescape-theme') === 'dark',
                autoPlay: localStorage.getItem('vibescape-autoPlay') === 'true',
                highQuality: localStorage.getItem('vibescape-highQuality') === 'true'
            };
            
            if (notificationsToggle) notificationsToggle.checked = settings.notifications;
            if (darkModeToggle) darkModeToggle.checked = settings.darkMode;
            if (autoPlayToggle) autoPlayToggle.checked = settings.autoPlay;
            if (highQualityToggle) highQualityToggle.checked = settings.highQuality;
        };

        [notificationsToggle, darkModeToggle, autoPlayToggle, highQualityToggle].forEach(toggle => {
            if (toggle) {
                toggle.addEventListener('change', () => {
                    const setting = toggle.id.replace('-toggle', '');
                    if (setting === 'darkMode') {
                        localStorage.setItem('vibescape-theme', toggle.checked ? 'dark' : 'light');
                        applyTheme(toggle.checked ? 'dark' : 'light');
                    } else {
                        localStorage.setItem(`vibescape-${setting}`, toggle.checked);
                    }
                });
            }
        });

        // --- DATA LOADING & FORM SUBMISSIONS ---
        const loadUserData = async () => {
            if (!token) {
                alert('Not logged in!');
                window.location.href = '/index.html';
                return;
            }
            
            const userData = await apiCall('/api/user', 'GET');
            if (userData) {
                if (usernameSpan) usernameSpan.textContent = userData.username;
                if (emailSpan) emailSpan.textContent = userData.email;
            }
        };

        if (usernameForm) {
            usernameForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newUsername = document.getElementById('new-username').value;
                if (!newUsername.trim()) return;
                
                const result = await apiCall('/api/update-username', 'PUT', { username: newUsername });
                if (result) {
                    if (usernameSpan) usernameSpan.textContent = newUsername;
                    usernameForm.reset();
                    alert('Username updated successfully!');
                }
            });
        }

        if (emailForm) {
            emailForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newEmail = document.getElementById('new-email').value;
                if (!newEmail.trim()) return;
                
                const result = await apiCall('/api/update-email', 'PUT', { email: newEmail });
                if (result) {
                    if (emailSpan) emailSpan.textContent = newEmail;
                    emailForm.reset();
                    alert('Email updated successfully!');
                }
            });
        }

        if (passwordForm) {
            passwordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const currentPassword = document.getElementById('current-password').value;
                const newPassword = document.getElementById('new-password').value;
                const confirmPassword = document.getElementById('confirm-new-password').value;
                
                if (newPassword !== confirmPassword) {
                    alert('New passwords do not match!');
                    return;
                }
                
                const result = await apiCall('/api/update-password', 'PUT', { 
                    currentPassword, 
                    newPassword 
                });
                if (result) {
                    passwordForm.reset();
                    alert('Password updated successfully!');
                }
            });
        }

        // --- MODAL LOGIC ---
        const openModal = (title, message, action) => {
            if (modalTitle) modalTitle.textContent = title;
            if (modalMessage) modalMessage.textContent = message;
            if (modal) modal.style.display = 'flex';
            confirmAction = action;
        };

        const closeModal = () => { 
            if (modal) modal.style.display = 'none'; 
            confirmAction = null; 
        };

        if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
        if (modalConfirmBtn) {
            modalConfirmBtn.addEventListener('click', () => {
                if (confirmAction) confirmAction();
                closeModal();
            });
        }

        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => openModal(
                'Clear History?', 
                'This action cannot be undone.', 
                () => {
                    // *** FIX 2: The actual action to clear history ***
                    localStorage.removeItem('playHistory');
                    alert("Listening history has been cleared.");
                }
            ));
        }

        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => openModal(
                'Delete Account?', 
                'This will permanently erase all data.', 
                () => { 
                    alert("Account deleted (Simulated)"); 
                    handleLogout(); 
                }
            ));
        }

        // --- INITIAL LOAD ---
        loadUserData();
        loadLocalSettings();
    }

    // NOTE: All home page music player functionality has been moved to home.js
    // to avoid conflicts when both scripts are loaded on the home page.

});