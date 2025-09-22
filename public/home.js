document.addEventListener('DOMContentLoaded', async () => {

    let songs = []; // This will be filled by the server

    // Fetches the song list from the server's API
    async function loadSongsFromServer() {
        try {
            const response = await fetch('/api/songs');
            if (!response.ok) throw new Error('Failed to fetch song list');
            songs = await response.json();
        } catch (error) {
            console.error('Could not load songs from server:', error);
            // You could show an error message on the page if you want
        }
    }

    // === Theme Toggle ===
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            document.body.classList.toggle('light-mode');
            const icon = this.querySelector('i');
            if (icon) icon.classList.toggle('fa-sun');
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

    // === PLAYLISTS & FAVOURITES HELPER FUNCTIONS ===
    function getPlaylists() {
        return JSON.parse(localStorage.getItem('playlists')) || {};
    }
    function savePlaylists(data) {
        localStorage.setItem('playlists', JSON.stringify(data));
    }
    function selectPlaylistAndAdd(songTitle) {
        let playlists = getPlaylists();
        let playlistNames = Object.keys(playlists);
        let playlist = prompt(
            playlistNames.length > 0
                ? `Enter playlist name to add "${songTitle}" (existing: ${playlistNames.join(', ')}):`
                : `Enter a name for your first playlist:`
        );
        if (!playlist) return;
        playlist = playlist.trim();
        if (!playlists[playlist]) playlists[playlist] = [];
        if (!playlists[playlist].includes(songTitle)) {
            playlists[playlist].push(songTitle);
            savePlaylists(playlists);
            alert(`Added "${songTitle}" to playlist "${playlist}".`);
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
    await loadSongsFromServer(); // First, get the song list from the server
    
    // Then, initialize the UI with the loaded songs
    if (songs.length > 0) {
        loadSong(currentIndex);
        updateRecentlyPlayed();
        populateArtists();
    } else {
        console.error("Application cannot start: No songs were loaded from the server or fallback.");
    }
    
    // Refresh songs periodically to get new uploads without reloading the page
    setInterval(loadSongsFromServer, 30000);
});