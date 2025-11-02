document.addEventListener('DOMContentLoaded', async () => {
    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    const hideLoading = () => {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
            document.body.classList.add('loaded');
        }
    };

    let songs = []; // This will be filled by the server

    // Optimized function to fetch songs with caching and timeout
    async function loadSongsFromServer() {
        try {
            // Check cache first (only if less than 5 minutes old)
            const cachedSongs = localStorage.getItem('vibescape-songs-cache');
            const cacheTimestamp = localStorage.getItem('vibescape-songs-timestamp');
            const cacheAge = Date.now() - parseInt(cacheTimestamp || '0');
            
            if (cachedSongs && cacheAge < 300000) { // 5 minutes
                console.log('🚀 Using cached songs data');
                songs = JSON.parse(cachedSongs);
                displayAllSongs();
                hideLoading();
                return;
            }
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch('/api/songs', {
                signal: controller.signal,
                cache: 'default' // Use browser cache when possible
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            
            const newSongs = await response.json();
            
            // Only update if we got valid data
            if (Array.isArray(newSongs) && newSongs.length > 0) {
                songs = newSongs;
                // Cache songs in localStorage as fallback
                try {
                    localStorage.setItem('vibescape-songs-cache', JSON.stringify(songs));
                    localStorage.setItem('vibescape-songs-timestamp', Date.now().toString());
                } catch (e) {
                    console.warn('Could not cache songs:', e);
                }
                console.log('✅ Songs loaded successfully from server');
                displayAllSongs();
                hideLoading();
            } else {
                console.warn('Empty or invalid songs data received');
                tryLoadFromCache();
            }
        } catch (error) {
            console.error('Could not load songs from server:', error);
            
            // Try to load from cache as fallback
            tryLoadFromCache();
        }
    }
    
    // Fallback function to load cached songs
    function tryLoadFromCache() {
        try {
            const cachedSongs = localStorage.getItem('vibescape-songs-cache');
            const timestamp = localStorage.getItem('vibescape-songs-timestamp');
            
            if (cachedSongs && timestamp) {
                const cacheAge = Date.now() - parseInt(timestamp);
                // Use cache if less than 5 minutes old
                if (cacheAge < 5 * 60 * 1000) {
                    songs = JSON.parse(cachedSongs);
                    console.log('✅ Songs loaded from cache');
                    displayAllSongs();
                    hideLoading();
                    return true;
                }
            }
        } catch (e) {
            console.warn('Could not load from cache:', e);
        }
        
        // If no cache available, show error
        console.warn('No songs available - server unreachable and no cache');
        showConnectionError();
        return false;
    }
    
    function showConnectionError() {
        hideLoading();
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #888;">
                <h3>🌐 Connection Issue</h3>
                <p>Having trouble loading songs. Please check your connection and try refreshing.</p>
                <button onclick="window.location.reload()" 
                        style="padding: 10px 20px; background: #1db954; border: none; border-radius: 20px; color: white; cursor: pointer;">
                    Refresh Page
                </button>
            </div>
        `;
        const gridContainer = document.querySelector('.grid-container');
        if (gridContainer) {
            gridContainer.innerHTML = '';
            gridContainer.appendChild(errorDiv);
        }
    }
    
    // Simple function to display all songs (for cached loading)
    function displayAllSongs() {
        // Since home page doesn't have a main song grid, just populate the sections
        populateArtists();
        updateRecentlyPlayed();
        console.log('✅ All content sections updated');
    }

    // === Theme Toggle ===
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }

        themeToggle.addEventListener('click', function () {
            document.body.classList.toggle('light-theme');
            const icon = this.querySelector('i');
            
            if (document.body.classList.contains('light-theme')) {
                // Switch to light theme
                localStorage.setItem('theme', 'light');
                if (icon) {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                }
            } else {
                // Switch to dark theme
                localStorage.setItem('theme', 'dark');
                if (icon) {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                }
            }
        });
    }

    // === Profile dropdown toggle ===
    const profile = document.querySelector('.profile');
    const dropdown = document.getElementById('profile-dropdown');
    if (profile && dropdown) {
        profile.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', () => dropdown.style.display = 'none');
        dropdown.addEventListener('click', e => e.stopPropagation());
    }

    // === HELPER FUNCTION TO CREATE SONG CARDS ===
    function createSongCard(song) {
        const card = document.createElement('div');
        card.className = 'song-card'; // Use a generic class for styling

        const img = document.createElement('img');
        img.src = song.art;
        img.alt = song.title;

        const title = document.createElement('div');
        title.className = 'song-title';
        title.textContent = song.title;
        
        const artist = document.createElement('div');
        artist.className = 'song-artist';
        artist.textContent = song.artist;

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(artist);

        // Add click listener to play the song
        card.addEventListener('click', () => {
            const songIndex = songs.findIndex(s => s.title === song.title);
            if (songIndex !== -1) {
                currentIndex = songIndex;
                isEmotionMode = false;
                loadSong(currentIndex);
                playSong();
            }
        });

        return card;
    }

    // === PLAYLISTS & FAVOURITES HELPER FUNCTIONS ===
    async function getPlaylists() {
        const token = sessionStorage.getItem('vibescape-token');
        if (!token) return {};
        
        try {
            const response = await fetch('/api/playlists', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const playlists = await response.json();
                // Convert array to object for compatibility
                const playlistObj = {};
                playlists.forEach(playlist => {
                    playlistObj[playlist.name] = {
                        songs: playlist.songs,
                        id: playlist._id
                    };
                });
                return playlistObj;
            }
        } catch (error) {
            console.error('Error fetching playlists:', error);
        }
        return {};
    }

    async function getFavorites() {
        const token = sessionStorage.getItem('vibescape-token');
        if (!token) return [];
        
        try {
            const response = await fetch('/api/favorites', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const favorites = await response.json();
                console.log('⭐ Retrieved favorites:', favorites);
                return favorites;
            }
        } catch (error) {
            console.error('Error fetching favorites:', error);
        }
        return [];
    }

    async function addToFavorites(songTitle, artist) {
        console.log('⭐ addToFavorites called:', songTitle, 'by', artist);
        const token = sessionStorage.getItem('vibescape-token');
        console.log('🔑 Token exists:', !!token);
        if (!token) {
            alert('Please login to add favorites');
            return false;
        }
        
        try {
            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    songTitle: songTitle, 
                    artist: artist 
                })
            });
            
            if (response.ok) {
                console.log('✅ Added to favorites successfully');
                return true;
            } else {
                const errorData = await response.json();
                console.error('❌ Failed to add to favorites:', errorData.error);
                return false;
            }
        } catch (error) {
            console.error('Error adding to favorites:', error);
            return false;
        }
    }

    async function removeFromFavorites(songTitle, artist) {
        console.log('⭐ removeFromFavorites called:', songTitle, 'by', artist);
        const token = sessionStorage.getItem('vibescape-token');
        if (!token) return false;
        
        try {
            const response = await fetch('/api/favorites', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    songTitle: songTitle, 
                    artist: artist 
                })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Error removing from favorites:', error);
            return false;
        }
    }
    
    async function savePlaylists(data) {
        // This function is no longer needed as individual playlist operations
        // will be handled by savePlaylistToServer
        console.log('Use savePlaylistToServer for individual playlist operations');
    }
    
    async function savePlaylistToServer(playlistName, songs) {
        console.log('💾 savePlaylistToServer called:', playlistName, songs);
        const token = sessionStorage.getItem('vibescape-token');
        console.log('🔑 Token exists:', !!token);
        if (!token) {
            alert('Please login to save playlists');
            return false;
        }
        
        try {
            // Get existing playlists to check if this playlist exists
            const existingPlaylists = await getPlaylists();
            const existingPlaylist = existingPlaylists[playlistName];
            
            if (existingPlaylist && existingPlaylist.id) {
                // Update existing playlist
                const response = await fetch(`/api/playlists/${existingPlaylist.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ songs })
                });
                return response.ok;
            } else {
                // Create new playlist
                const response = await fetch('/api/playlists', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        name: playlistName, 
                        songs 
                    })
                });
                return response.ok;
            }
        } catch (error) {
            console.error('Error saving playlist:', error);
            return false;
        }
    }
    
    async function selectPlaylistAndAdd(songTitle) {
        console.log('🎵 selectPlaylistAndAdd called with:', songTitle);
        let playlists = await getPlaylists();
        console.log('📋 Retrieved playlists:', playlists);
        let playlistNames = Object.keys(playlists);
        let playlist = prompt(
            playlistNames.length > 0
                ? `Enter playlist name to add "${songTitle}" (existing: ${playlistNames.join(', ')}):`
                : `Enter a name for your first playlist:`
        );
        if (!playlist) return;
        playlist = playlist.trim();
        
        // Get current songs for this playlist
        let currentSongs = playlists[playlist] ? playlists[playlist].songs || [] : [];
        console.log('🎵 Current songs in playlist:', currentSongs);
        
        if (!currentSongs.includes(songTitle)) {
            currentSongs.push(songTitle);
            console.log('💾 Saving playlist to server:', playlist, currentSongs);
            const success = await savePlaylistToServer(playlist, currentSongs);
            if (success) {
                alert(`Added "${songTitle}" to playlist "${playlist}".`);
            } else {
                alert('Failed to save playlist. Please check your connection and try again.');
            }
        } else {
            alert(`"${songTitle}" is already in "${playlist}".`);
        }
    }

    // === PLAYER LOGIC & SETUP ===
    const audio = document.createElement('audio');
    document.body.appendChild(audio);
    let currentIndex = 0;
    let isEmotionMode = false;

    // === EMOTION DETECTION LOGIC ===
    const startBtn = document.getElementById('start-detection');
    const stopBtn = document.getElementById('stop-detection');
    const webcamContainer = document.getElementById('webcam-container');
    const webcam = document.getElementById('webcam');
    const emotionLabel = document.getElementById('emotion-label');
    let stream = null;
    const emotions = ['Happy', 'Sad', 'Angry', 'Neutral', 'Surprised'];

    function startEmotionDetection() {
        emotionLabel.textContent = 'Scanning...';
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
        }, 3000);
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            webcam.srcObject = null;
            webcamContainer.style.display = 'none';
            stopBtn.style.display = 'none';
            startBtn.style.display = 'inline-block';
            emotionLabel.textContent = 'N/A';
            isEmotionMode = false;
        }
    }

    if (startBtn && stopBtn) {
        startBtn.onclick = () => {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(s => {
                    stream = s;
                    webcam.srcObject = stream;
                    webcamContainer.style.display = 'inline-block';
                    stopBtn.style.display = 'inline-block';
                    startBtn.style.display = 'none';
                    startEmotionDetection();
                })
                .catch(() => alert("Webcam access denied or an error occurred."));
        };
        stopBtn.onclick = stopCamera;
    }

    // === SEARCH LOGIC ===
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchResultsSection = document.getElementById('search-results');
    const searchResultsList = document.getElementById('search-results-list');

    console.log('Search elements found:', {
        searchInput: !!searchInput,
        searchButton: !!searchButton,
        searchResultsSection: !!searchResultsSection,
        searchResultsList: !!searchResultsList
    });

    function performSearch() {
        const query = searchInput.value.toLowerCase().trim();
        console.log('Search query:', query); // Debug log
        console.log('Available songs:', songs); // Debug log
        
        if (!query) {
            searchResultsSection.style.display = 'none';
            return;
        }

        const results = songs.filter(song => 
            song.title.toLowerCase().includes(query) ||
            song.artist.toLowerCase().includes(query) ||
            song.genre.toLowerCase().includes(query)
        );

        console.log('Search results:', results); // Debug log
        
        if (results.length > 0) {
            // Optimized: Use document fragment for better performance
            const fragment = document.createDocumentFragment();
            results.forEach(song => {
                const songCard = createSongCard(song);
                fragment.appendChild(songCard);
            });
            searchResultsList.innerHTML = ''; // Clear previous results
            searchResultsList.appendChild(fragment);
            searchResultsSection.style.display = 'block';
        } else {
            searchResultsList.innerHTML = '<p>No results found.</p>';
            searchResultsSection.style.display = 'block';
        }
    }

    if (searchButton && searchInput) {
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
    } else {
        console.error('Search elements not found!');
    }

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
        if (!audio.src) {
            console.log('No audio source loaded');
            return;
        }
        console.log('Attempting to play:', audio.src);
        audio.play()
            .then(() => {
                console.log('Audio playing successfully');
                updatePlayButtonsState(true);
                document.getElementById('full-player').style.display = 'flex';
                
                // Add to database history when song starts playing
                if (songs && songs[currentIndex] && typeof addToHistory === 'function') {
                    const currentSong = songs[currentIndex];
                    addToHistory(currentSong.title, currentSong.artist);
                }
            })
            .catch(error => {
                console.error("Error playing audio:", error);
                updatePlayButtonsState(false);
            });
    }

    function pauseSong() {
        console.log('Pausing audio');
        audio.pause();
        updatePlayButtonsState(false);
    }

    function updatePlayButtonsState(isPlaying) {
        const playIcon = isPlaying ? '<span>❚❚</span>' : '<span>&#9654;</span>';
        const playPauseBtn = document.getElementById('play-pause');
        const fullPlayPauseBtn = document.getElementById('full-play-pause');
        
        if (playPauseBtn) {
            playPauseBtn.innerHTML = playIcon;
        } else {
            console.error('play-pause button not found');
        }
        
        if (fullPlayPauseBtn) {
            fullPlayPauseBtn.innerHTML = playIcon;
        } else {
            console.error('full-play-pause button not found');
        }
        
        console.log('Button state updated:', isPlaying ? 'PLAYING' : 'PAUSED');
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
    console.log('Setting up event listeners...');
    
    const playPauseBtn = document.getElementById('play-pause');
    const fullPlayPauseBtn = document.getElementById('full-play-pause');
    const nextBtn = document.getElementById('next');
    const prevBtn = document.getElementById('prev');
    const fullNextBtn = document.getElementById('full-next');
    const fullPrevBtn = document.getElementById('full-prev');
    
    if (playPauseBtn) {
        playPauseBtn.onclick = () => { 
            console.log('Mini play/pause clicked');
            isEmotionMode = false; 
            audio.paused ? playSong() : pauseSong(); 
        };
        console.log('Mini play/pause listener added');
    } else {
        console.error('play-pause button not found!');
    }
    
    if (nextBtn) {
        nextBtn.onclick = nextSong;
        console.log('Next button listener added');
    } else {
        console.error('next button not found!');
    }
    
    if (prevBtn) {
        prevBtn.onclick = prevSong;
        console.log('Prev button listener added');
    } else {
        console.error('prev button not found!');
    }
    
    if (fullPlayPauseBtn) {
        fullPlayPauseBtn.onclick = () => { 
            console.log('Full play/pause clicked');
            isEmotionMode = false; 
            audio.paused ? playSong() : pauseSong(); 
        };
        console.log('Full play/pause listener added');
    } else {
        console.error('full-play-pause button not found!');
    }
    
    if (fullNextBtn) {
        fullNextBtn.onclick = nextSong;
        console.log('Full next button listener added');
    } else {
        console.error('full-next button not found!');
    }
    
    if (fullPrevBtn) {
        fullPrevBtn.onclick = prevSong;
        console.log('Full prev button listener added');
    } else {
        console.error('full-prev button not found!');
    }
    
    // Improved rewind/forward with bounds checking
    document.getElementById('full-rewind').onclick = () => {
        audio.currentTime = Math.max(0, audio.currentTime - 10);
    };
    document.getElementById('full-forward').onclick = () => {
        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
    };
    
    document.getElementById('minimize-player').addEventListener('click', () => {
        document.getElementById('full-player').style.display = 'none';
    });

    // Add audio event listeners for better state management
    audio.addEventListener('play', () => updatePlayButtonsState(true));
    audio.addEventListener('pause', () => updatePlayButtonsState(false));
    audio.addEventListener('ended', () => updatePlayButtonsState(false));

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
        updatePlayButtonsState(false); // Ensure buttons show play state
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
        if (!artistList) return;
        
        const uniqueArtists = [...new Map(songs.map(song => [song.artist, song])).values()];
        
        // Optimized: Build all HTML at once instead of concatenating
        const artistCardsHTML = uniqueArtists.map(artist => `
            <div class="artist-card" data-artist="${artist.artist}">
                <img src="${artist.artistArt}" alt="${artist.artist}">
                <div class="artist-name">${artist.artist}</div>
            </div>`
        ).join('');
        
        artistList.innerHTML = artistCardsHTML;
    }

    function displaySongsForArtist(artistName) {
        const artistSongsSection = document.getElementById('artist-songs');
        if (!artistSongsSection) return;
        
        const artistTitle = document.getElementById('artist-title');
        const songList = document.getElementById('artist-song-list');
        
        if (artistTitle) artistTitle.textContent = `More from ${artistName}`;
        if (!songList) return;
        
        const songsByArtist = songs.filter(song => song.artist === artistName);
        
        // Optimized: Build all HTML at once
        const trackCardsHTML = songsByArtist.map(song => `
            <div class="track-card" data-title="${song.title}" data-artist="${song.artist}">
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
            </div>`
        ).join('');
        
        songList.innerHTML = trackCardsHTML;
        artistSongsSection.style.display = 'block';
    }

    function displaySongsForGenre(genre) {
        const genreSongList = document.getElementById('genre-song-list');
        const genreTitle = document.getElementById('genre-title');
        const genreSongs = document.getElementById('genre-songs');
        
        if (!genreSongList || !genreTitle || !genreSongs) return;
        
        genreTitle.textContent = `${genre} Songs`;
        
        const songsInGenre = songs.filter(song => song.genre === genre);
        
        if (songsInGenre.length > 0) {
            // Optimized: Build all HTML at once
            const trackCardsHTML = songsInGenre.map(song => `
                <div class="track-card" data-title="${song.title}" data-artist="${song.artist}">
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
                </div>`
            ).join('');
            genreSongList.innerHTML = trackCardsHTML;
        } else {
            genreSongList.innerHTML = `<p style="color: var(--subtext-color);">No songs found for this genre.</p>`;
        }
        
        genreSongs.style.display = 'block';
    }

    function updateRecentlyPlayed() {
        const recentlyPlayedList = document.getElementById('recently-played-list');
        if (!recentlyPlayedList) return;
        
        const history = [...new Set(JSON.parse(localStorage.getItem('playHistory')) || [])];
        const recentSongsToDisplay = history.slice(0, 6);
        
        if (recentSongsToDisplay.length === 0) {
            recentlyPlayedList.innerHTML = `<p style="color: var(--subtext-color);">Your recently played songs will appear here.</p>`;
            return;
        }
        
        // Optimized: Build all HTML at once
        const trackCardsHTML = recentSongsToDisplay
            .map(songTitle => {
                const songData = songs.find(s => s.title === songTitle);
                return songData ? `
                    <div class="track-card" data-title="${songData.title}" data-artist="${songData.artist}">
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
                    </div>` : '';
            })
            .filter(html => html)
            .join('');
            
        recentlyPlayedList.innerHTML = trackCardsHTML;
    }

    // === SINGLE EVENT LISTENER FOR ALL DYNAMIC CLICKS ===
    document.addEventListener('click', async (e) => {
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
            console.log('🎯 Add to Playlist clicked!');
            e.stopPropagation();
            const songTitle = e.target.closest('.track-card').getAttribute('data-title');
            console.log('🎵 Song title:', songTitle);
            selectPlaylistAndAdd(songTitle);
            e.target.parentElement.style.display = 'none';
        } else if (e.target.matches('.add-to-favourites')) {
            e.stopPropagation();
            const trackCard = e.target.closest('.track-card');
            const songTitle = trackCard.getAttribute('data-title');
            const artist = trackCard.getAttribute('data-artist');
            
            console.log('⭐ Adding to favorites:', songTitle, 'by', artist);
            
            // Disable button during processing
            e.target.disabled = true;
            e.target.textContent = "Adding...";
            
            const success = await addToFavorites(songTitle, artist);
            if (success) {
                e.target.textContent = "Added!";
            } else {
                e.target.textContent = "Failed to add";
            }
            
            setTimeout(() => {
                e.target.textContent = "Add to Favourites";
                e.target.disabled = false;
            }, 1500);
            
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

    // === HELPER FUNCTIONS FOR BETTER UX ===
    function initializePageUI() {
        // Initialize UI components that don't require server data
        updateRecentlyPlayed(); // This works with localStorage
        
        // Show a loading indicator for dynamic content
        const artistList = document.getElementById('artist-list');
        if (artistList) {
            artistList.innerHTML = '<div class="loading">Loading artists...</div>';
        }
    }
    
    function showErrorMessage(message) {
        const artistList = document.getElementById('artist-list');
        if (artistList) {
            artistList.innerHTML = `<div class="error-message">${message}</div>`;
        }
    }

    // === OPTIMIZED STARTUP SEQUENCE ===
    // Show page immediately, load songs asynchronously
    initializePageUI();
    
    // Load songs in background without blocking page display
    loadSongsFromServer().then(() => {
        if (songs.length > 0) {
            loadSong(currentIndex);
            updateRecentlyPlayed();
            populateArtists();
            console.log('Songs loaded successfully');
        } else {
            console.warn("No songs loaded from server, some features may be limited");
        }
    }).catch(error => {
        console.error("Failed to load songs:", error);
        showErrorMessage("Failed to load music library. Please check your connection.");
    });
    
    // Refresh songs periodically (reduced frequency to improve performance)
    setInterval(loadSongsFromServer, 60000); // Changed from 30s to 60s
});