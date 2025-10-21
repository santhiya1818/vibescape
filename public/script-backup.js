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
            const resetEmailInput = document.getElementById('reset-email');
            
            if (!resetEmailInput) {
                console.error('Reset email input not found');
                return;
            }

            const email = resetEmailInput.value;

            // Visual feedback that the button was clicked
            if (messageDiv) {
                messageDiv.textContent = 'Sending request...';
                messageDiv.style.color = 'var(--subtext-color)';
                messageDiv.style.display = 'block';
            }

            try {
                const response = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                // Try to get the JSON response from the server, even if it's an error
                const result = await response.json();

                if (messageDiv) {
                    if (response.ok) {
                        // --- SUCCESS ---
                        alert('This is a simulation. In a real app, this link would be emailed to you.\n\nPlease copy and paste this link into your browser to reset your password:\n\n' + result.resetLink);
                        messageDiv.textContent = 'A simulated reset link has been generated and displayed.';
                        messageDiv.style.color = 'var(--primary-color)';
                    } else {
                        // --- SERVER-SIDE ERROR ---
                        // The server responded, but with an error status (like 400 or 500)
                        console.error('Server responded with an error:', result);
                        messageDiv.textContent = `Error from server: ${result.error || 'An unknown error occurred.'}`;
                        messageDiv.style.color = '#dc3545'; // Red for error
                    }
                }
            } catch (error) {
                // --- NETWORK OR FETCH ERROR ---
                // This happens if it can't connect to the server at all
                console.error('Fetch error for forgot-password:', error);
                if (messageDiv) {
                    messageDiv.textContent = 'Could not connect to the server. Is it running?';
                    messageDiv.style.color = '#dc3545';
                }
            }
        });
    }

    // =======================================================
    // --- SETTINGS PAGE LOGIC (Only runs on settings.html) ---
    // =======================================================
    const settingsContainer = document.querySelector('.settings-container');
    if (settingsContainer) {
        
        // --- TAB SWITCHING LOGIC ---
        const tabLinks = document.querySelectorAll('.tab-link');
        const tabPanes = document.querySelectorAll('.tab-pane');
        tabLinks.forEach(link => {
            link.addEventListener('click', () => {
                const tabId = link.getAttribute('data-tab');
                tabLinks.forEach(item => item.classList.remove('active'));
                link.classList.add('active');
                tabPanes.forEach(pane => {
                    pane.id === tabId ? pane.classList.add('active') : pane.classList.remove('active');
                });
            });
        });

        // --- AUTH & DOM ELEMENTS ---
        // Try both localStorage and sessionStorage for backward compatibility
        const token = sessionStorage.getItem('vibescape-token') || localStorage.getItem('vibescape-token');
        
        console.log('Token found:', token ? 'Yes' : 'No'); // Debug log
        
        if (!token) {
            console.log('No authentication token found, redirecting to login');
            window.location.href = '/index.html';
            return;
        }

        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const profilePicPreview = document.getElementById('profile-pic-preview');
        const profilePicUpload = document.getElementById('profile-pic-upload');
        const removePicBtn = document.getElementById('remove-pic-btn');
        const profileForm = document.getElementById('profile-form');
        const passwordForm = document.getElementById('password-form');
        const autoplayToggle = document.getElementById('autoplay-toggle');
        const canvasToggle = document.getElementById('canvas-toggle');
        const publicPlaylistsToggle = document.getElementById('public-playlists-toggle');
        const clearHistoryBtn = document.getElementById('clear-history-btn');
        const deleteAccountBtn = document.getElementById('delete-account-btn');
        const modal = document.getElementById('confirmation-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalText = document.getElementById('modal-text');
        const modalCancelBtn = document.getElementById('modal-cancel-btn');
        const modalConfirmBtn = document.getElementById('modal-confirm-btn');

        // --- API HELPER WITH IMPROVED ERROR HANDLING ---
        const fetchAPI = async (url, options = {}) => {
            const headers = { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}`, 
                ...options.headers 
            };
            
            console.log('Making API request to:', url); // Debug log
            console.log('With headers:', headers); // Debug log
            
            try {
                const response = await fetch(url, { ...options, headers });
                
                console.log('Response status:', response.status); // Debug log
                console.log('Response headers:', response.headers); // Debug log
                
                if (response.status === 401) { 
                    console.log('Unauthorized response, logging out');
                    handleLogout(); 
                    throw new Error('Unauthorized'); 
                }
                
                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    console.error('Response is not JSON:', contentType);
                    const text = await response.text();
                    console.error('Response text:', text);
                    throw new Error('Server returned non-JSON response');
                }
                
                return response;
            } catch (error) {
                console.error('fetchAPI error:', error);
                throw error;
            }
        };
        
        // --- LOGOUT FUNCTION ---
        const handleLogout = () => {
            console.log('Logging out user');
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/index.html';
        };

        // Only add logout event listener if the element exists
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => { 
                e.preventDefault(); 
                handleLogout(); 
            });
        }

        // --- PROFILE PICTURE LOGIC ---
        if (profilePicUpload) {
            profilePicUpload.addEventListener('change', () => {
                const file = profilePicUpload.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const newPicDataUrl = e.target.result;
                        // *** FIX 1: Save the new picture to localStorage and update all images ***
                        localStorage.setItem('vibescape-profilePic', newPicDataUrl);
                        updateProfilePictures(); // This updates both preview and header
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        if (removePicBtn) {
            removePicBtn.addEventListener('click', () => {
                // *** FIX 1: Remove the picture from localStorage and update all images ***
                localStorage.removeItem('vibescape-profilePic');
                // Set images back to a default placeholder
                const defaultPic = "data:image/svg+xml,..."; // Your default SVG placeholder
                document.querySelectorAll('#profile-img, #profile-pic-preview').forEach(img => {
                    if (img) img.src = img.id === 'profile-pic-preview' ? defaultPic.replace('40x40', '150x150') : defaultPic;
                });
                profilePicUpload.value = '';
            });
        }

        // --- LOCAL SETTINGS (TOGGLES) ---
        const localSettings = { autoplay: true, showCanvas: true, publicPlaylists: true };
        const saveLocalSettings = () => localStorage.setItem('vibescape-settings', JSON.stringify(localSettings));
        const loadLocalSettings = () => {
            const saved = JSON.parse(localStorage.getItem('vibescape-settings'));
            if (saved) Object.assign(localSettings, saved);
            if (autoplayToggle) autoplayToggle.checked = localSettings.autoplay;
            if (canvasToggle) canvasToggle.checked = localSettings.showCanvas;
            if (publicPlaylistsToggle) publicPlaylistsToggle.checked = localSettings.publicPlaylists;
        };

        if (autoplayToggle) {
            autoplayToggle.addEventListener('change', () => { 
                localSettings.autoplay = autoplayToggle.checked; 
                saveLocalSettings(); 
            });
        }

        if (canvasToggle) {
            canvasToggle.addEventListener('change', () => { 
                localSettings.showCanvas = canvasToggle.checked; 
                saveLocalSettings(); 
            });
        }

        if (publicPlaylistsToggle) {
            publicPlaylistsToggle.addEventListener('change', () => { 
                localSettings.publicPlaylists = publicPlaylistsToggle.checked; 
                saveLocalSettings(); 
            });
        }

        // --- DATA LOADING & FORM SUBMISSIONS ---
        const loadUserData = async () => {
            try {
                console.log('Loading user data...');
                const response = await fetchAPI('/api/user/profile');
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Profile fetch failed:', response.status, errorText);
                    throw new Error(`Failed to fetch data: ${response.status}`);
                }
                
                const user = await response.json();
                console.log('User data loaded:', user);
                
                if (usernameInput) usernameInput.value = user.username || '';
                if (emailInput) emailInput.value = user.email || '';
            } catch (error) { 
                console.error('Error loading user data:', error);
                
                // Show user-friendly error message
                if (usernameInput) usernameInput.placeholder = 'Error loading username';
                if (emailInput) emailInput.placeholder = 'Error loading email';
                
                // If it's an auth error, redirect to login
                if (error.message.includes('Unauthorized') || error.message.includes('401')) {
                    handleLogout();
                }
            }
        };

        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!usernameInput || !emailInput) return;
                
                const updatedData = { username: usernameInput.value, email: emailInput.value };
                try {
                    const response = await fetchAPI('/api/user/profile', { method: 'PUT', body: JSON.stringify(updatedData) });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error);
                    alert(result.message);
                    
                    // Update stored username if changed
                    if (sessionStorage.getItem('vibescape-user')) {
                        sessionStorage.setItem('vibescape-user', updatedData.username);
                    }
                    if (localStorage.getItem('vibescape-user')) {
                        localStorage.setItem('vibescape-user', updatedData.username);
                    }
                } catch (error) { 
                    alert(`Error: ${error.message}`); 
                }
            });
        }

        if (passwordForm) {
            passwordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const currentPasswordInput = document.getElementById('current-password');
                const newPasswordInput = document.getElementById('new-password');
                
                if (!currentPasswordInput || !newPasswordInput) return;
                
                const currentPassword = currentPasswordInput.value;
                const newPassword = newPasswordInput.value;
                
                if (!currentPassword || !newPassword) {
                    alert('Both current and new passwords are required.');
                    return;
                }
                
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
                    alert(`Error: ${error.message}`); 
                }
            });
        }

        // --- MODAL LOGIC ---
        let confirmAction = null;
        const openModal = (title, text, action) => {
            if (modalTitle && modalText && modal) {
                modalTitle.textContent = title;
                modalText.textContent = text;
                confirmAction = action;
                modal.style.display = 'flex';
            }
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

    // =======================================================
    // --- HOME PAGE LOGIC REMOVED - Now handled by home.js ---
    // =======================================================
    // All music player functionality has been moved to home.js to avoid conflicts

        // === CORE PLAYER FUNCTIONS ===
        function loadSong(index) {
        if (!songs || songs.length === 0) return;
        const song = songs[index];
        audio.src = song.file; // The server provides the correct path
        document.getElementById('current-song-title').textContent = song.title;
        document.getElementById('current-song-artist').textContent = song.artist;
        document.querySelector('.mini-player .album-art').src = song.art;
        document.getElementById('full-player-art').src = song.art;
        document.getElementById('full-player-title').textContent = song.title;
        document.getElementById('full-player-artist').textContent = song.artist;
        let history = JSON.parse(localStorage.getItem('playHistory')) || [];
        if (history[0] !== song.title) {
            history.unshift(song.title);
            localStorage.setItem('playHistory', JSON.stringify(history));
        }
        updateRecentlyPlayed();
    }

    function playSong() {
        if (!audio.src) return;
        audio.play().catch(error => console.error("Error playing audio:", error));
        document.getElementById('play-pause').innerHTML = '<span>❚❚</span>';
        document.getElementById('full-play-pause').innerHTML = '<span>❚❚</span>';
        document.getElementById('full-player').style.display = 'flex';
    }

    function pauseSong() {
        audio.pause();
        document.getElementById('play-pause').innerHTML = '<span>&#9654;</span>';
        document.getElementById('full-play-pause').innerHTML = '<span>&#9654;</span>';
    }

    function nextSong() {
        isEmotionMode = false;
        currentIndex = (currentIndex + 1) % songs.length;
        loadSong(currentIndex);
        playSong();
    }

    function prevSong() {
        isEmotionMode = false;
        currentIndex = (currentIndex - 1 + songs.length) % songs.length;
        loadSong(currentIndex);
        playSong();
    }

        // === EVENT LISTENERS FOR STATIC ELEMENTS ===
        document.getElementById('play-pause').onclick = () => { isEmotionMode = false; audio.paused ? playSong() : pauseSong(); };
    document.getElementById('next').onclick = nextSong;
    document.getElementById('prev').onclick = prevSong;
    document.getElementById('full-play-pause').onclick = () => { isEmotionMode = false; audio.paused ? playSong() : pauseSong(); };
    document.getElementById('full-next').onclick = nextSong;
    document.getElementById('full-prev').onclick = prevSong;
    document.getElementById('full-rewind').onclick = () => audio.currentTime -= 10;
    document.getElementById('full-forward').onclick = () => audio.currentTime += 10;
    document.getElementById('minimize-player').addEventListener('click', () => {
        document.getElementById('full-player').style.display = 'none';
    });

    const seekBar = document.getElementById('seek-bar');
    const currentTimeEl = document.getElementById('current-time');
    const totalDurationEl = document.getElementById('total-duration');

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    audio.addEventListener('loadedmetadata', () => totalDurationEl.textContent = formatTime(audio.duration));
    audio.addEventListener('timeupdate', () => {
        seekBar.value = (audio.currentTime / audio.duration) * 100 || 0;
        currentTimeEl.textContent = formatTime(audio.currentTime);
    });
    seekBar.addEventListener('input', () => audio.currentTime = (seekBar.value / 100) * audio.duration);

    function handleSongEnd() {
        if (isEmotionMode) {
            isEmotionMode = false;
            const continueDetection = confirm("Do you want to continue face detection?");
            if (continueDetection) {
                startBtn.click();
            }
        } else {
            nextSong();
        }
    }
    audio.addEventListener('ended', handleSongEnd);

        // === DYNAMIC CONTENT FUNCTIONS ===
        function populateArtists() {
        const artistList = document.getElementById('artist-list');
        const uniqueArtists = [...new Map(songs.map(song => [song.artist, song])).values()];
        artistList.innerHTML = '';
        uniqueArtists.forEach(artist => {
            const artistCardHTML = `
                <div class="artist-card" data-artist="${artist.artist}">
                    <img src="${artist.artistArt}" alt="${artist.artist}">
                    <div class="artist-name">${artist.artist}</div>
                </div>`;
            artistList.innerHTML += artistCardHTML;
        });
    }

    function displaySongsForArtist(artistName) {
        const artistSongsSection = document.getElementById('artist-songs');
        document.getElementById('artist-title').textContent = `More from ${artistName}`;
        const songList = document.getElementById('artist-song-list');
        songList.innerHTML = '';
        const songsByArtist = songs.filter(song => song.artist === artistName);
        songsByArtist.forEach(song => {
            const trackCardHTML = `
                <div class="track-card" data-title="${song.title}">
                    <img src="${song.art}" alt="${song.title}" class="track-card-art">
                    <div class="track-card-info">
                        <div class="track-card-title">${song.title}</div>
                        <div class="track-card-artist">${song.artist}</div>
                    </div>
                    <div class="menu-btn">⋮</div>
                    <div class="menu-options">
                        <div class="add-to-playlist">Add to Playlist</div>
                        <div class="add-to-favourites">Add to Favourites</div>
                    </div>
                </div>`;
            songList.innerHTML += trackCardHTML;
        });
        artistSongsSection.style.display = 'block';
    }

    function displaySongsForGenre(genre) {
        const genreSongList = document.getElementById('genre-song-list');
        document.getElementById('genre-title').textContent = `${genre} Songs`;
        genreSongList.innerHTML = '';
        const songsInGenre = songs.filter(song => song.genre === genre);
        if (songsInGenre.length > 0) {
            songsInGenre.forEach(song => {
                const trackCardHTML = `
                  <div class="track-card" data-title="${song.title}">
                    <img src="${song.art}" alt="${song.title}" class="track-card-art">
                    <div class="track-card-info">
                      <div class="track-card-title">${song.title}</div>
                      <div class="track-card-artist">${song.artist}</div>
                    </div>
                    <div class="menu-btn">⋮</div>
                    <div class="menu-options">
                      <div class="add-to-playlist">Add to Playlist</div>
                      <div class="add-to-favourites">Add to Favourites</div>
                    </div>
                  </div>`;
                genreSongList.innerHTML += trackCardHTML;
            });
        } else {
            genreSongList.innerHTML = `<p style="color: var(--subtext-color);">No songs found for this genre.</p>`;
        }
        document.getElementById('genre-songs').style.display = 'block';
    }

    function updateRecentlyPlayed() {
        const recentlyPlayedList = document.getElementById('recently-played-list');
        recentlyPlayedList.innerHTML = '';
        const history = [...new Set(JSON.parse(localStorage.getItem('playHistory')) || [])];
        const recentSongsToDisplay = history.slice(0, 6);
        if (recentSongsToDisplay.length === 0) {
            recentlyPlayedList.innerHTML = `<p style="color: var(--subtext-color);">Your recently played songs will appear here.</p>`;
            return;
        }
        recentSongsToDisplay.forEach(songTitle => {
            const songData = songs.find(s => s.title === songTitle);
            if (songData) {
                const trackCardHTML = `
                  <div class="track-card" data-title="${songData.title}">
                    <img src="${songData.art}" alt="${songData.title}" class="track-card-art">
                    <div class="track-card-info">
                        <div class="track-card-title">${songData.title}</div>
                        <div class="track-card-artist">${songData.artist}</div>
                    </div>
                    <div class="menu-btn">⋮</div>
                    <div class="menu-options">
                      <div class="add-to-playlist">Add to Playlist</div>
                      <div class="add-to-favourites">Add to Favourites</div>
                    </div>
                  </div>`;
                recentlyPlayedList.innerHTML += trackCardHTML;
            }
        });
    }

        // === SINGLE EVENT LISTENER FOR ALL DYNAMIC CLICKS ===
        document.addEventListener('click', (e) => {
        const genreCard = e.target.closest('.genre-card');
        if (genreCard) {
            displaySongsForGenre(genreCard.getAttribute('data-genre'));
            return;
        }
        const artistCard = e.target.closest('.artist-card');
        if (artistCard) {
            displaySongsForArtist(artistCard.getAttribute('data-artist'));
            return;
        }
        if (e.target.matches('.menu-btn')) {
            e.stopPropagation();
            const menu = e.target.closest('.track-card').querySelector('.menu-options');
            document.querySelectorAll('.menu-options').forEach(m => m !== menu && (m.style.display = 'none'));
            if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            return;
        }
        if (!e.target.closest('.menu-options')) {
            document.querySelectorAll('.menu-options').forEach(m => m.style.display = 'none');
        }
        if (e.target.matches('.add-to-playlist')) {
            e.stopPropagation();
            const songTitle = e.target.closest('.track-card').getAttribute('data-title');
            selectPlaylistAndAdd(songTitle);
            e.target.parentElement.style.display = 'none';
        } else if (e.target.matches('.add-to-favourites')) {
            e.stopPropagation();
            const songTitle = e.target.closest('.track-card').getAttribute('data-title');
            let favourites = JSON.parse(localStorage.getItem('favourites')) || [];
            if (!favourites.includes(songTitle)) {
                favourites.push(songTitle);
                localStorage.setItem('favourites', JSON.stringify(favourites));
                e.target.textContent = "Added!";
            } else {
                e.target.textContent = "Already added";
            }
            setTimeout(() => e.target.textContent = "Add to Favourites", 1500);
            e.target.parentElement.style.display = 'none';
        }
        const trackCard = e.target.closest('.track-card');
        if (trackCard && !e.target.closest('.menu-btn, .menu-options')) {
            isEmotionMode = false;
            const songTitle = trackCard.getAttribute('data-title');
            const songIndex = songs.findIndex(s => s.title === songTitle);
            if (songIndex !== -1) {
                currentIndex = songIndex;
                loadSong(currentIndex);
                playSong();
            }
        }
    });

        // === INITIAL APP STARTUP SEQUENCE ===
        async function initializeHomePage() {
            await loadSongsFromServer(); // First, get the song list
            
            // Then, initialize the UI
            if (songs.length > 0) {
                loadSong(currentIndex);
                updateRecentlyPlayed();
                populateArtists();
            } else {
                console.error("Application cannot start: No songs loaded.");
            }
            
            // Refresh songs periodically
            setInterval(loadSongsFromServer, 30000);
        }

        initializeHomePage();
    }

        // =======================================================
    // --- FAVOURITES PAGE LOGIC (Only runs on favourites.html) ---
    // =======================================================
    // Use an element unique to favourites.html to run this block
    const favouritesListEl = document.getElementById('favourites-list');
    if (favouritesListEl) {

        let allSongs = [];
        let sortMode = 'default';
        let displayList = [];
        let playingTitle = null;
        let isUserScrubbing = false;

        const audioEl = document.getElementById('audio');
        const sortSelect = document.getElementById('sort-select');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const toggleBtn = document.getElementById('toggle-btn');
        const deleteBtn = document.getElementById('delete-selected');

        // --- FETCH THE MASTER SONG LIST FROM THE SERVER ---
        async function loadSongsFromServer() {
            try {
                const response = await fetch('/api/songs');
                if (!response.ok) throw new Error('Failed to fetch song library');
                allSongs = await response.json();
            } catch (error) {
                console.error("Could not load song library:", error);
                favouritesListEl.innerHTML = '<div class="no-songs error">Could not load song library from server.</div>';
            }
        }

        // --- LOCALSTORAGE HELPERS ---
        function getFavourites() { return JSON.parse(localStorage.getItem('favourites')) || []; }
        function setFavourites(arr) { localStorage.setItem('favourites', JSON.stringify(arr)); }

        // --- RENDER LOGIC ---
        function buildAndRender() {
            const favTitles = getFavourites();
            
            let baseList = [...favTitles];
            if (sortMode === 'asc') baseList.sort((a, b) => a.localeCompare(b));
            else if (sortMode === 'desc') baseList.sort((a, b) => b.localeCompare(a));
            displayList = baseList;

            if (displayList.length === 0) {
                favouritesListEl.innerHTML = '<div class="no-songs">No favourites yet. Add some from the Home page!</div>';
                return;
            }

            favouritesListEl.innerHTML = displayList.map(title => {
                const isPlaying = playingTitle === title && !audioEl.paused && audioEl.src;
                return `
                    <div class="favourite-card" data-title="${title}">
                        <input type="checkbox" class="delete-checkbox" data-title="${title}" />
                        <div class="favourite-title">${title}</div>
                        <div class="card-controls">
                            <button class="back-10" title="Back 10s"><i class="fa-solid fa-rotate-left"></i></button>
                            <button class="toggle" title="Play/Pause">
                                ${isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>'}
                            </button>
                            <button class="fwd-10" title="Forward 10s"><i class="fa-solid fa-rotate-right"></i></button>
                        </div>
                        <div class="seek-wrap">
                            <input class="seek" type="range" min="0" max="100" value="0">
                        </div>
                        <div class="time"><span class="cur">0:00</span> / <span class="dur">0:00</span></div>
                    </div>
                `;
            }).join('');
            
            updateAllProgress();
            updateGlobalToggleIcon();
        }
         // --- PLAYER CONTROLS ---
        function playSongByTitle(title) {
            const songData = allSongs.find(song => song.title === title);
            if (!songData || !songData.file) {
                alert(`Audio file for "${title}" not found in the library.`);
                if(playingTitle === title) {
                    audioEl.pause();
                    playingTitle = null;
                }
                buildAndRender();
                return;
            }

            if (playingTitle === title) { // If it's the current song, just toggle
                audioEl.paused ? audioEl.play() : audioEl.pause();
            } else { // Load and play a new song
                playingTitle = title;
                audioEl.src = songData.file;
                audioEl.play();
            }
            buildAndRender();
        }

        function playNext() {
            if (displayList.length === 0) return;
            const currentIndex = displayList.findIndex(title => title === playingTitle);
            const nextIndex = (currentIndex + 1) % displayList.length;
            playSongByTitle(displayList[nextIndex]);
        }

        function playPrev() {
            if (displayList.length === 0) return;
            const currentIndex = displayList.findIndex(title => title === playingTitle);
            const prevIndex = (currentIndex - 1 + displayList.length) % displayList.length;
            playSongByTitle(displayList[prevIndex]);
        }
        
        // --- EVENT HANDLERS ---
        listEl.addEventListener('click', (e) => {
            const card = e.target.closest('.favourite-card');
            if (!card) return;
            const title = card.dataset.title;

            if (e.target.closest('.toggle')) playSongByTitle(title);
            if (e.target.closest('.back-10')) seekRelative(-10, title);
            if (e.target.closest('.fwd-10')) seekRelative(10, title);
        });

        listEl.addEventListener('input', (e) => {
            if (e.target.classList.contains('seek')) {
                const card = e.target.closest('.favourite-card');
                if (card.dataset.title === playingTitle) {
                    isUserScrubbing = true;
                }
            }
        });

        listEl.addEventListener('change', (e) => {
            if (e.target.classList.contains('seek')) {
                const card = e.target.closest('.favourite-card');
                if (card.dataset.title === playingTitle) {
                    isUserScrubbing = false;
                    const pct = Number(e.target.value) / 100;
                    if (isFinite(audioEl.duration)) {
                        audioEl.currentTime = pct * audioEl.duration;
                    }
                }
            }
        });
        
        prevBtn.onclick = playPrev;
        nextBtn.onclick = playNext;
        toggleBtn.onclick = () => {
            if (playingTitle) {
                playSongByTitle(playingTitle); // Toggle current song
            } else if (displayList.length > 0) {
                playSongByTitle(displayList[0]); // Play first song in the list
            }
        };

        deleteBtn.onclick = () => {
            const checkedTitles = Array.from(listEl.querySelectorAll('.delete-checkbox:checked')).map(cb => cb.dataset.title);
            if (checkedTitles.length === 0) {
                alert('Select songs to delete.');
                return;
            }
            if (checkedTitles.includes(playingTitle)) {
                audioEl.pause();
                audioEl.removeAttribute('src');
                playingTitle = null;
            }
            let favs = getFavourites();
            favs = favs.filter(title => !checkedTitles.includes(title));
            setFavourites(favs);
            buildAndRender();
        };

        // --- PROGRESS & TIME UPDATES ---
        function updateAllProgress() {
            listEl.querySelectorAll('.favourite-card').forEach(card => {
                const title = card.dataset.title;
                const seekEl = card.querySelector('.seek');
                const curEl = card.querySelector('.time .cur');
                const durEl = card.querySelector('.time .dur');
                
                if (title === playingTitle && isFinite(audioEl.duration)) {
                    durEl.textContent = fmt(audioEl.duration);
                    if (!isUserScrubbing) {
                        const pct = (audioEl.currentTime / audioEl.duration) * 100;
                        seekEl.value = isFinite(pct) ? pct : 0;
                        curEl.textContent = fmt(audioEl.currentTime);
                    }
                } else {
                    seekEl.value = 0;
                    curEl.textContent = '0:00';
                    durEl.textContent = '0:00';
                }
            });
        }
        
        function updateGlobalToggleIcon() {
            toggleBtn.innerHTML = audioEl.paused || !audioEl.src ? '<i class="fa-solid fa-play"></i>' : '<i class="fa-solid fa-pause"></i>';
        }

        function seekRelative(delta, title) {
            if (playingTitle !== title) {
                playSongByTitle(title);
            } else {
                audioEl.currentTime = Math.max(0, Math.min(audioEl.currentTime + delta, audioEl.duration));
            }
        }
        
        function fmt(sec) {
            if (!isFinite(sec) || sec < 0) sec = 0;
            const m = Math.floor(sec / 60);
            const s = Math.floor(sec % 60);
            return m + ':' + (s < 10 ? '0' : '') + s;
        }

        audioEl.addEventListener('timeupdate', updateAllProgress);
        audioEl.addEventListener('loadedmetadata', updateAllProgress);
        audioEl.addEventListener('play', buildAndRender);
        audioEl.addEventListener('pause', buildAndRender);
        audioEl.addEventListener('ended', playNext);
        
        sortSelect.addEventListener('change', () => {
            sortMode = sortSelect.value;
            buildAndRender();

            
        })
        const profileImg = document.getElementById("profile-img");
        const profileDropdown = document.getElementById("profile-dropdown");
        if (profileImg && profileDropdown) {
             profileImg.addEventListener("click", (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle("show");
            });
            document.addEventListener("click", () => {
                profileDropdown.classList.remove("show");
            });
        }
       
        // --- INITIALIZATION ---
        async function initializeFavouritesPage() {
            await loadSongsFromServer();
            buildAndRender();
        }

        initializeFavouritesPage();
    };
        

    // --- NEW PASSWORD FORM LOGIC (for reset-password.html) ---
    const newPasswordForm = document.getElementById('new-password-form');
    if (newPasswordForm) {
        const messageDiv = document.getElementById('message');

        newPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirm-password');
            
            if (!passwordInput || !confirmPasswordInput) {
                console.error('Password inputs not found');
                return;
            }

            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Get the token from the URL
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            if (password !== confirmPassword) {
                if (messageDiv) {
                    messageDiv.textContent = 'Passwords do not match.';
                    messageDiv.style.color = '#dc3545';
                    messageDiv.style.display = 'block';
                }
                return;
            }

            if (!token) {
                if (messageDiv) {
                    messageDiv.textContent = 'Invalid or missing reset token.';
                    messageDiv.style.color = '#dc3545';
                    messageDiv.style.display = 'block';
                }
                return;
            }

            try {
                const response = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, password })
                });

                const result = await response.json();

                if (messageDiv) {
                    if (response.ok) {
                        messageDiv.textContent = 'Password has been reset successfully! Redirecting to login...';
                        messageDiv.style.color = 'var(--primary-color)';
                        messageDiv.style.display = 'block';
                        setTimeout(() => {
                            window.location.href = '/index.html';
                        }, 2500);
                    } else {
                        messageDiv.textContent = result.error || 'An error occurred.';
                        messageDiv.style.color = '#dc3545';
                        messageDiv.style.display = 'block';
                    }
                }
            } catch (error) {
                if (messageDiv) {
                    messageDiv.textContent = 'Could not connect to the server.';
                    messageDiv.style.color = '#dc3545';
                    messageDiv.style.display = 'block';
                }
            }
        });
    }
});//-------------------------me-------------------