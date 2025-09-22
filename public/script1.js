// Complete VibeScape Application Script - Powers ALL pages
// This single script handles: Login, Signup, Password Reset, Home, Settings, Favourites, History, and more

document.addEventListener('DOMContentLoaded', () => {

    // =======================================================
    // --- GLOBAL STATE & CORE FUNCTIONS ---
    // =======================================================
    let masterSongList = []; // The complete library of all songs from the server.
    let userData = {};       // A single object to hold all data for the LOGGED-IN user.
    let currentAudio = null; // Global audio element reference

    const token = localStorage.getItem('vibescape-token') || sessionStorage.getItem('vibescape-token');

    const fetchAPI = async (url, options = {}) => {
        const currentToken = localStorage.getItem('vibescape-token') || sessionStorage.getItem('vibescape-token');
        if (!currentToken && url.includes('/api/user')) {
            handleLogout();
            return Promise.reject(new Error('No token found'));
        }
        const headers = { 
            'Content-Type': 'application/json', 
            ...(currentToken && { 'Authorization': `Bearer ${currentToken}` }),
            ...options.headers 
        };
        try {
            const response = await fetch(url, { ...options, headers });
            if (response.status === 401 && url.includes('/api/user')) { 
                handleLogout(); 
                throw new Error('Unauthorized'); 
            }
            return response;
        } catch (error) {
            console.error("API Fetch Error:", error);
            throw error;
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        window.location.href = '/index.html';
    };

    // =======================================================
    // --- GLOBAL UI INITIALIZATION (Runs on every page) ---
    // =======================================================
    
    const themeToggle = document.getElementById('theme-toggle');
    const applyTheme = (theme) => {
        document.body.classList.toggle('light-mode', theme === 'light');
        const icon = themeToggle ? themeToggle.querySelector('i') : null;
        if (icon) {
            icon.classList.toggle('fa-moon', theme === 'light');
            icon.classList.toggle('fa-sun', theme !== 'light');
        }
    };
    const toggleTheme = () => {
        const newTheme = document.body.classList.contains('light-mode') ? 'dark' : 'light';
        localStorage.setItem('vibescape-theme', newTheme);
        applyTheme(newTheme);
    };
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    applyTheme(localStorage.getItem('vibescape-theme'));

    const updateProfilePictures = (picUrl) => {
        const defaultPic = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23cccccc'/%3E%3C/svg%3E";
        const urlToSet = picUrl || localStorage.getItem('vibescape-profilePic') || defaultPic;
        document.querySelectorAll('#profile-img, #profile-pic-preview').forEach(img => {
            if (img) img.src = urlToSet;
        });
    };
    updateProfilePictures();

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

    // =======================================================
    // --- PUBLIC PAGES LOGIC (Login, Signup, Reset, etc.) ---
    // =======================================================
    if (!token) {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            const messageDiv = document.createElement('div');
            messageDiv.style.display = 'none';
            messageDiv.style.marginTop = '1rem';
            messageDiv.style.textAlign = 'center';
            loginForm.querySelector('.signup-link').insertAdjacentElement('beforebegin', messageDiv);
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                try {
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const result = await response.json();
                    if (response.ok) {
                        messageDiv.textContent = "Login successful! Redirecting...";
                        messageDiv.style.color = 'var(--primary-color)';
                        messageDiv.style.display = 'block';
                        localStorage.setItem('vibescape-token', result.token);
                        setTimeout(() => { window.location.href = '/home.html'; }, 1500);
                    } else {
                        messageDiv.textContent = result.error || 'An error occurred.';
                        messageDiv.style.color = '#dc3545';
                        messageDiv.style.display = 'block';
                    }
                } catch (error) {
                    messageDiv.textContent = 'Could not connect to the server.';
                    messageDiv.style.color = '#dc3545';
                }
            });
        }

        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            const messageDiv = document.getElementById('signup-message');
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirm-password').value;
                if (password !== confirmPassword) {
                    messageDiv.textContent = "Passwords do not match!";
                    messageDiv.style.color = '#dc3545';
                    messageDiv.style.display = 'block';
                    return;
                }
                try {
                    const response = await fetch('/api/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, email, password })
                    });
                    const result = await response.json();
                    if (response.ok) {
                        messageDiv.textContent = result.message;
                        messageDiv.style.color = 'var(--primary-color)';
                        messageDiv.style.display = 'block';
                        setTimeout(() => { window.location.href = '/index.html'; }, 2000);
                    } else {
                        messageDiv.textContent = result.error || 'An error occurred.';
                        messageDiv.style.color = '#dc3545';
                        messageDiv.style.display = 'block';
                    }
                } catch (error) {
                    messageDiv.textContent = 'Could not connect to the server.';
                    messageDiv.style.color = '#dc3545';
                    messageDiv.style.display = 'block';
                }
            });
        }
    }

    // =======================================================
    // --- PROTECTED PAGES LOGIC (Home, Settings, Favourites, etc.) ---
    // =======================================================
    const profileDropdown = document.getElementById('profile-dropdown');
    if (token && profileDropdown) {

        async function initializeUserSession() {
            try {
                const [songsResponse, userDataResponse] = await Promise.all([
                    fetch('/api/songs'),
                    fetchAPI('/api/user/fulldata')
                ]);
                if (!songsResponse.ok) throw new Error('Could not load song library');
                if (!userDataResponse || !userDataResponse.ok) throw new Error('Could not load user data');
                masterSongList = await songsResponse.json();
                userData = await userDataResponse.json();
                localStorage.setItem('vibescape-profilePic', userData.profilePic || '');
                updateProfilePictures(userData.profilePic);
                runPageSpecificLogic();
            } catch (error) {
                console.error("Failed to initialize user session:", error);
                handleLogout();
            }
        }

        function runPageSpecificLogic() {
            if (document.querySelector('.search-section')) initializeHomePage();
            if (document.querySelector('.settings-container')) initializeSettingsPage();
            if (document.getElementById('favourites-list')) initializeFavouritesPage();
            if (document.getElementById('history-list')) initializeHistoryPage();
        }

        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) logoutLink.addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });

        function initializeHomePage() {
            currentAudio = document.createElement('audio');
            let currentIndex = 0;
            let isEmotionMode = false;
            
            const playPauseBtn = document.getElementById('play-pause');
            const nextBtn = document.getElementById('next');
            const prevBtn = document.getElementById('prev');
            const fullPlayPauseBtn = document.getElementById('full-play-pause');
            const fullNextBtn = document.getElementById('full-next');
            const fullPrevBtn = document.getElementById('full-prev');
            const minimizeBtn = document.getElementById('minimize-player');
            const seekBar = document.getElementById('seek-bar');
            const currentTimeEl = document.getElementById('current-time');
            const totalDurationEl = document.getElementById('total-duration');
            const startBtn = document.getElementById('start-detection');
            const stopBtn = document.getElementById('stop-detection');
            const webcamContainer = document.getElementById('webcam-container');
            const webcam = document.getElementById('webcam');
            const emotionLabel = document.getElementById('emotion-label');
            let stream = null;
            const emotions = ['Happy', 'Sad', 'Angry', 'Neutral', 'Surprised'];

            function loadSong(index) {
                if (index < 0 || index >= masterSongList.length) return;
                currentIndex = index;
                const song = masterSongList[currentIndex];
                currentAudio.src = song.file;
                document.getElementById('current-song-title').textContent = song.title;
                document.getElementById('current-song-artist').textContent = song.artist;
                document.querySelector('.mini-player .album-art').src = song.art;
                document.getElementById('full-player-art').src = song.art;
                document.getElementById('full-player-title').textContent = song.title;
                document.getElementById('full-player-artist').textContent = song.artist;
                
                fetchAPI('/api/user/history', {
                    method: 'POST', body: JSON.stringify({ songTitle: song.title })
                }).then(res => res.json()).then(data => userData.history = data.history);
            }

            function playSong() {
                if (!currentAudio.src) return;
                currentAudio.play().then(() => {
                    if (playPauseBtn) playPauseBtn.innerHTML = '<span>❚❚</span>';
                    if (fullPlayPauseBtn) fullPlayPauseBtn.innerHTML = '<span>❚❚</span>';
                    document.getElementById('full-player').style.display = 'flex';
                }).catch(e => console.error("Play Error:", e));
            }

            function pauseSong() {
                currentAudio.pause();
                if (playPauseBtn) playPauseBtn.innerHTML = '<span>&#9654;</span>';
                if (fullPlayPauseBtn) fullPlayPauseBtn.innerHTML = '<span>&#9654;</span>';
            }

            function nextSong() {
                isEmotionMode = false;
                currentIndex = (currentIndex + 1) % masterSongList.length;
                loadSong(currentIndex);
                playSong();
            }

            function prevSong() {
                isEmotionMode = false;
                currentIndex = (currentIndex - 1 + masterSongList.length) % masterSongList.length;
                loadSong(currentIndex);
                playSong();
            }

            function formatTime(seconds) {
                if (!isFinite(seconds) || seconds < 0) return '0:00';
                const minutes = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
            }

            if (playPauseBtn) playPauseBtn.addEventListener('click', () => currentAudio.paused ? playSong() : pauseSong());
            if (nextBtn) nextBtn.addEventListener('click', nextSong);
            if (prevBtn) prevBtn.addEventListener('click', prevSong);
            if (fullPlayPauseBtn) fullPlayPauseBtn.addEventListener('click', () => currentAudio.paused ? playSong() : pauseSong());
            if (fullNextBtn) fullNextBtn.addEventListener('click', nextSong);
            if (fullPrevBtn) fullPrevBtn.addEventListener('click', prevSong);
            if (minimizeBtn) minimizeBtn.addEventListener('click', () => document.getElementById('full-player').style.display = 'none');
            
            currentAudio.addEventListener('timeupdate', () => {
                if (seekBar && isFinite(currentAudio.duration) && currentAudio.duration > 0) seekBar.value = (currentAudio.currentTime / currentAudio.duration) * 100;
                if (currentTimeEl) currentTimeEl.textContent = formatTime(currentAudio.currentTime);
            });
            currentAudio.addEventListener('loadedmetadata', () => {
                if (totalDurationEl) totalDurationEl.textContent = formatTime(currentAudio.duration);
            });
            currentAudio.addEventListener('ended', nextSong);
            if (seekBar) seekBar.addEventListener('input', () => {
                if (isFinite(currentAudio.duration)) currentAudio.currentTime = (seekBar.value / 100) * currentAudio.duration;
            });

            function startEmotionDetection() { emotionLabel.textContent = 'Scanning...';
        setTimeout(() => {
            const detectedEmotion = emotions[Math.floor(Math.random() * emotions.length)];
            emotionLabel.textContent = detectedEmotion;
            const playEmotionSong = confirm(`Detected emotion: ${detectedEmotion}\n\nWould you like to play a song matching this emotion?`);
            if (playEmotionSong) {
                const matchingSongs = songs.filter(song => song.emotion === detectedEmotion);
                if (matchingSongs.length > 0) {
                    const randomSong = matchingSongs[Math.floor(Math.random() * matchingSongs.length)];
                    const songIndex = songs.findIndex(s => s.title === randomSong.title);
                    if (songIndex !== -1) {
                        currentIndex = songIndex;
                        isEmotionMode = true;
                        loadSong(currentIndex);
                        playSong();
                    }
                } else {
                    alert(`Sorry, no songs found for your current mood: ${detectedEmotion}`);
                    stopCamera();
                }
            } else {
                stopCamera();
            }
        }, 3000); }
            function stopCamera() { if (stream) {
            stream.getTracks().forEach(track => track.stop());
            webcam.srcObject = null;
            webcamContainer.style.display = 'none';
            stopBtn.style.display = 'none';
            startBtn.style.display = 'inline-block';
            emotionLabel.textContent = 'N/A';
            isEmotionMode = false;
        }}
            if(startBtn) startBtn.addEventListener('click', startEmotionDetection);
            if(stopBtn) stopBtn.addEventListener('click', stopCamera);

            document.addEventListener('click', (e) => {
                if (e.target.matches('.add-to-favourites')) {
                    e.stopPropagation();
                    const songTitle = e.target.closest('.track-card').getAttribute('data-title');
                    if(songTitle){
                        fetchAPI('/api/user/favourites', {
                            method: 'POST', body: JSON.stringify({ songTitle })
                        }).then(res => res.json()).then(data => {
                            userData.favourites = data.favourites;
                            alert(data.message);
                        });
                    }
                }
                const trackCard = e.target.closest('.track-card');
                if(trackCard && !e.target.closest('.menu-options, .menu-btn')) {
                    const songTitle = trackCard.getAttribute('data-title');
                    const songIndex = masterSongList.findIndex(s => s.title === songTitle);
                    if(songIndex !== -1) {
                        loadSong(songIndex);
                        playSong();
                    }
                }
            });

            if (masterSongList.length > 0) loadSong(0);
        }

        function initializeSettingsPage() {
            const tabLinks = document.querySelectorAll('.tab-link');
            const tabPanes = document.querySelectorAll('.tab-pane');
            tabLinks.forEach(link => {
                link.addEventListener('click', () => {
                    const tabId = link.getAttribute('data-tab');
                    tabLinks.forEach(item => item.classList.remove('active'));
                    link.classList.add('active');
                    tabPanes.forEach(pane => pane.classList.toggle('active', pane.id === tabId));
                });
            });

            const usernameInput = document.getElementById('username');
            const emailInput = document.getElementById('email');
            if(usernameInput) usernameInput.value = userData.username;
            if(emailInput) emailInput.value = userData.email;

            const profilePicUpload = document.getElementById('profile-pic-upload');
            if (profilePicUpload) {
                profilePicUpload.addEventListener('change', () => {
                    const file = profilePicUpload.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const newPicDataUrl = e.target.result;
                        localStorage.setItem('vibescape-profilePic', newPicDataUrl);
                        updateProfilePictures(newPicDataUrl);
                        fetchAPI('/api/user/profile', {
                            method: 'PUT', body: JSON.stringify({ profilePic: newPicDataUrl })
                        });
                    };
                    reader.readAsDataURL(file);
                });
            }
            const removePicBtn = document.getElementById('remove-pic-btn');
            if(removePicBtn){
                removePicBtn.addEventListener('click', () => {
                    localStorage.setItem('vibescape-profilePic', '');
                    updateProfilePictures('');
                    fetchAPI('/api/user/profile', { method: 'PUT', body: JSON.stringify({ profilePic: '' }) });
                });
            }

            const clearHistoryBtn = document.getElementById('clear-history-btn');
            if (clearHistoryBtn) {
                clearHistoryBtn.addEventListener('click', () => {
                    if (confirm("Are you sure? This will permanently clear your history.")) {
                        fetchAPI('/api/user/history', { method: 'DELETE' })
                            .then(res => res.json())
                            .then(data => {
                                userData.history = data.history;
                                alert(data.message);
                            });
                    }
                });
            }
            
            const profileForm = document.getElementById('profile-form');
            if (profileForm) {
                profileForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const updatedData = { username: usernameInput.value, email: emailInput.value };
                    try {
                        const response = await fetchAPI('/api/user/profile', { method: 'PUT', body: JSON.stringify(updatedData) });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.error);
                        alert(result.message);
                    } catch (error) { alert(`Error: ${error.message}`); }
                });
            }
        }
        
        function initializeFavouritesPage() {
            const listEl = document.getElementById('favourites-list');
            const deleteBtn = document.getElementById('delete-selected');
            const audioEl = document.getElementById('audio');

            function buildAndRender() {
                const favTitles = userData.favourites || [];
                if (favTitles.length === 0) {
                    listEl.innerHTML = '<div class="no-songs">No favourites yet.</div>';
                    return;
                }
                listEl.innerHTML = favTitles.map(title => {
                    const songData = masterSongList.find(s => s.title === title);
                    return `
                        <div class="favourite-card" data-title="${title}">
                            <input type="checkbox" class="delete-checkbox" data-title="${title}" />
                            <div class="favourite-title">${title}</div>
                            <div class="favourite-artist">${songData ? songData.artist : 'Unknown'}</div>
                        </div>
                    `;
                }).join('');
            }
            
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    const checkedTitles = Array.from(listEl.querySelectorAll('.delete-checkbox:checked')).map(cb => cb.dataset.title);
                    if (checkedTitles.length === 0) return alert('Select songs to delete.');
                    fetchAPI('/api/user/favourites', {
                        method: 'DELETE', body: JSON.stringify({ songTitles: checkedTitles })
                    }).then(res => res.json()).then(data => {
                        userData.favourites = data.favourites;
                        buildAndRender();
                        alert(data.message);
                    });
                });
            }
            buildAndRender();
        }

        function initializeHistoryPage() {
            const listEl = document.getElementById('history-list');
             function renderHistory() {
                const historyTitles = userData.history || [];
                 if (historyTitles.length === 0) {
                    listEl.innerHTML = '<p style="text-align:center;">No songs played yet.</p>';
                    return;
                }
                listEl.innerHTML = historyTitles.map(title => {
                     const songData = masterSongList.find(s => s.title === title);
                     return `<div class="history-item">
                                 <div class="song-title">${title}</div>
                                 <div class="song-artist">${songData ? songData.artist : 'Unknown'}</div>
                             </div>`;
                }).join('');
             }
             renderHistory();
        }

        initializeUserSession();
    }
});