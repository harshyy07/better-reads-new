export function initSpotify() {
  const playBtn = document.getElementById('sp-play');
  const trackItems = document.querySelectorAll('.sp-track-item');
  const trackNameEl = document.getElementById('sp-track');
  const artistNameEl = document.getElementById('sp-artist');
  const timeCurEl = document.getElementById('sp-time-cur');
  const timeDurEl = document.getElementById('sp-time-dur');
  const progressFill = document.getElementById('sp-bar-fill');
  const albumArt = document.querySelector('.spotify-album-art');
  const loginCta = document.querySelector('.spotify-login-cta');
  const loginBtn = document.getElementById('sp-login-btn');
  const connModal = document.getElementById('spotify-conn-modal');
  const connCloseBtn = document.getElementById('sp-conn-close-btn');
  const btnSpDemo = document.getElementById('btn-sp-demo');
  const btnSpRealConnect = document.getElementById('btn-sp-real-connect');
  const spClientIdInput = document.getElementById('sp-client-id');
  const spotifyPlaylistName = document.querySelector('.spotify-playlist-name');

  const playlistTracks = [
    { name: 'Acoustic Rain', artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { name: 'Midnight Study', artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { name: 'Coffee Shop Jazz', artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { name: 'Lofi Library', artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' }
  ];

  let currentTrackIdx = 0;
  let isPlaying = false;
  let isRealSpotify = false;
  let spotifyUser = null;
  let checkPlaybackInterval = null;

  const bgAudio = new Audio();
  bgAudio.src = playlistTracks[currentTrackIdx].src;

  // Check URL Hash for Access Token (Spotify OAuth redirect)
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  if (token) {
    localStorage.setItem('spotify_token', token);
    localStorage.setItem('spotify_is_real', 'true');
    localStorage.removeItem('spotify_is_demo');
    // Clear hash
    window.history.replaceState(null, null, window.location.pathname + window.location.search);
  }

  function formatSecs(secs) {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async function fetchSpotifyData(endpoint, method = 'GET', body = null) {
    const accessToken = localStorage.getItem('spotify_token');
    if (!accessToken) return null;

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    try {
      const options = { method, headers };
      if (body) options.body = JSON.stringify(body);
      const res = await fetch(`https://api.spotify.com/v1${endpoint}`, options);
      if (res.status === 401) {
        // Token expired
        disconnectSpotify();
        return null;
      }
      if (res.status === 204) return true; // No Content
      return await res.json();
    } catch (e) {
      console.warn("Spotify API error:", e);
      return null;
    }
  }

  function disconnectSpotify() {
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_is_real');
    localStorage.removeItem('spotify_is_demo');
    localStorage.removeItem('spotify_user_name');
    isRealSpotify = false;
    spotifyUser = null;
    if (checkPlaybackInterval) clearInterval(checkPlaybackInterval);
    updateSpotifyUI();
  }

  function updateSpotifyUI() {
    const isDemo = localStorage.getItem('spotify_is_demo') === 'true';
    const isReal = localStorage.getItem('spotify_is_real') === 'true';
    const savedName = localStorage.getItem('spotify_user_name') || 'Cozy Reader';

    if (isDemo || isReal) {
      isRealSpotify = isReal;
      // Change playlist header
      if (spotifyPlaylistName) {
        spotifyPlaylistName.innerHTML = `
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:#1DB954;margin-right:4px;">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.894-.982-.336.076-.67-.135-.746-.47-.077-.337.135-.67.472-.747 3.854-.88 7.15-.508 9.822 1.13.294.18.385.564.206.86zm1.226-2.72c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.08-1.182-.413.125-.845-.107-.97-.52-.125-.413.107-.847.52-.973 3.67-1.114 8.24-.57 11.35 1.345.366.226.486.708.26 1.075zm.106-2.828C14.568 8.94 8.974 8.755 5.73 9.74c-.5.15-1.025-.137-1.176-.637-.152-.5.137-1.024.637-1.175 3.73-1.133 9.897-.922 13.75 1.366.45.267.6.845.333 1.296-.268.453-.846.6-1.296.333z" />
          </svg>
          ${isReal ? 'Live Spotify' : 'Demo Playlist'} Connected
        `;
      }

      if (loginCta) {
        loginCta.innerHTML = `
          <p style="font-size:0.75rem;margin-bottom:0.4rem;color:rgba(255,255,255,0.7);">Connected as <strong>${savedName}</strong></p>
          <button class="spotify-login-btn" id="sp-disconnect-btn" style="background:#555;padding:0.35rem 1rem;font-size:0.75rem;">Disconnect</button>
        `;
        const disconnectBtn = document.getElementById('sp-disconnect-btn');
        if (disconnectBtn) disconnectBtn.addEventListener('click', disconnectSpotify);
      }

      if (albumArt) {
        albumArt.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="#1DB954" stroke-width="2.5" fill="none"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
      }
    } else {
      isRealSpotify = false;
      if (spotifyPlaylistName) {
        spotifyPlaylistName.innerHTML = `
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:#1DB954;margin-right:4px;">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.894-.982-.336.076-.67-.135-.746-.47-.077-.337.135-.67.472-.747 3.854-.88 7.15-.508 9.822 1.13.294.18.385.564.206.86zm1.226-2.72c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.08-1.182-.413.125-.845-.107-.97-.52-.125-.413.107-.847.52-.973 3.67-1.114 8.24-.57 11.35 1.345.366.226.486.708.26 1.075zm.106-2.828C14.568 8.94 8.974 8.755 5.73 9.74c-.5.15-1.025-.137-1.176-.637-.152-.5.137-1.024.637-1.175 3.73-1.133 9.897-.922 13.75 1.366.45.267.6.845.333 1.296-.268.453-.846.6-1.296.333z" />
          </svg>
          Cozy Reading Mode
        `;
      }
      if (loginCta) {
        loginCta.innerHTML = `
          <p>Connect your Spotify account for reading playlists</p>
          <button class="spotify-login-btn" id="sp-login-btn">Connect Spotify</button>
        `;
        const rebindLogin = document.getElementById('sp-login-btn');
        if (rebindLogin) rebindLogin.addEventListener('click', () => {
          if (connModal) connModal.classList.add('active');
        });
      }
      if (albumArt) {
        albumArt.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
      }
    }

    if (isRealSpotify) {
      // Real Spotify active state: audio element paused
      bgAudio.pause();
    } else {
      // Simulated Player UI sync
      const track = playlistTracks[currentTrackIdx];
      if (trackNameEl) trackNameEl.textContent = track.name;
      if (artistNameEl) artistNameEl.textContent = track.artist;

      trackItems.forEach((item, idx) => {
        item.classList.toggle('sp-active', idx === currentTrackIdx);
      });

      if (albumArt) {
        albumArt.style.animation = isPlaying ? 'musicPulse 1.5s infinite ease-in-out' : 'none';
      }

      if (playBtn) {
        playBtn.innerHTML = isPlaying 
          ? `<svg class="icon-pause" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:block;margin:auto;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
          : `<svg class="icon-play" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:block;margin:auto;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      }
    }
  }

  // Poll Spotify for playing track status if real connection active
  async function pollSpotifyPlayback() {
    if (!isRealSpotify) return;
    const playing = await fetchSpotifyData('/me/player/currently-playing');
    if (playing && playing.item) {
      if (trackNameEl) trackNameEl.textContent = playing.item.name;
      if (artistNameEl) artistNameEl.textContent = playing.item.artists.map(a => a.name).join(', ');
      
      const durationMs = playing.item.duration_ms;
      const progressMs = playing.progress_ms;
      
      if (timeCurEl) timeCurEl.textContent = formatSecs(progressMs / 1000);
      if (timeDurEl) timeDurEl.textContent = formatSecs(durationMs / 1000);
      if (progressFill) {
        progressFill.style.width = `${(progressMs / durationMs) * 100}%`;
      }
      
      isPlaying = playing.is_playing;
      if (albumArt) {
        albumArt.style.animation = isPlaying ? 'musicPulse 1.5s infinite ease-in-out' : 'none';
      }
      if (playBtn) {
        playBtn.innerHTML = isPlaying 
          ? `<svg class="icon-pause" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:block;margin:auto;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
          : `<svg class="icon-play" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:block;margin:auto;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      }
    }
  }

  // Setup Real Spotify connection init
  async function initializeRealSpotify() {
    const profile = await fetchSpotifyData('/me');
    if (profile) {
      localStorage.setItem('spotify_user_name', profile.display_name || profile.id);
      updateSpotifyUI();
      // Start polling
      pollSpotifyPlayback();
      checkPlaybackInterval = setInterval(pollSpotifyPlayback, 5000);
    } else {
      disconnectSpotify();
    }
  }

  if (localStorage.getItem('spotify_is_real') === 'true') {
    initializeRealSpotify();
  }

  // Audio elements local player control
  function playLocalTrack() {
    if (bgAudio.src !== playlistTracks[currentTrackIdx].src) {
      bgAudio.src = playlistTracks[currentTrackIdx].src;
    }
    bgAudio.play().then(() => {
      isPlaying = true;
      updateSpotifyUI();
    }).catch(err => {
      console.warn("Audio playback blocked:", err);
      isPlaying = false;
      updateSpotifyUI();
    });
  }

  function pauseLocalTrack() {
    bgAudio.pause();
    isPlaying = false;
    updateSpotifyUI();
  }

  // Control click triggers
  async function handlePlayBtn() {
    if (isRealSpotify) {
      if (isPlaying) {
        await fetchSpotifyData('/me/player/pause', 'PUT');
      } else {
        const started = await fetchSpotifyData('/me/player/play', 'PUT');
        if (!started) {
          alert('No active Spotify playback device found. Start playing music inside your Spotify App first!');
        }
      }
      setTimeout(pollSpotifyPlayback, 500);
    } else {
      if (isPlaying) {
        pauseLocalTrack();
      } else {
        playLocalTrack();
      }
    }
  }

  async function handleNextTrack() {
    if (isRealSpotify) {
      await fetchSpotifyData('/me/player/next', 'POST');
      setTimeout(pollSpotifyPlayback, 500);
    } else {
      currentTrackIdx = (currentTrackIdx + 1) % playlistTracks.length;
      if (isPlaying) playLocalTrack();
      else {
        bgAudio.src = playlistTracks[currentTrackIdx].src;
        updateSpotifyUI();
      }
    }
  }

  async function handlePrevTrack() {
    if (isRealSpotify) {
      await fetchSpotifyData('/me/player/previous', 'POST');
      setTimeout(pollSpotifyPlayback, 500);
    } else {
      currentTrackIdx = (currentTrackIdx - 1 + playlistTracks.length) % playlistTracks.length;
      if (isPlaying) playLocalTrack();
      else {
        bgAudio.src = playlistTracks[currentTrackIdx].src;
        updateSpotifyUI();
      }
    }
  }

  if (playBtn) playBtn.addEventListener('click', handlePlayBtn);
  const spNext = document.getElementById('sp-next');
  if (spNext) spNext.addEventListener('click', handleNextTrack);
  const spPrev = document.getElementById('sp-prev');
  if (spPrev) spPrev.addEventListener('click', handlePrevTrack);

  // Local tracks loaded listeners
  bgAudio.addEventListener('loadedmetadata', () => {
    if (!isRealSpotify && timeDurEl) timeDurEl.textContent = formatSecs(bgAudio.duration);
  });

  bgAudio.addEventListener('timeupdate', () => {
    if (!isRealSpotify) {
      if (timeCurEl) timeCurEl.textContent = formatSecs(bgAudio.currentTime);
      if (progressFill && bgAudio.duration) {
        progressFill.style.width = `${(bgAudio.currentTime / bgAudio.duration) * 100}%`;
      }
    }
  });

  bgAudio.addEventListener('ended', handleNextTrack);

  trackItems.forEach((item, idx) => {
    item.addEventListener('click', () => {
      if (isRealSpotify) {
        alert("Select specific tracks features are playing from the default cozy local list. Click disconnect to use local player controls.");
      } else {
        currentTrackIdx = idx;
        playLocalTrack();
      }
    });
  });

  const progressTrack = document.getElementById('sp-progress-track');
  if (progressTrack) {
    progressTrack.addEventListener('click', e => {
      if (isRealSpotify) return;
      if (!bgAudio.duration) return;
      const rect = progressTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      bgAudio.currentTime = percentage * bgAudio.duration;
    });
  }

  // Modal actions
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      if (connModal) connModal.classList.add('active');
    });
  }
  if (connCloseBtn) {
    connCloseBtn.addEventListener('click', () => {
      if (connModal) connModal.classList.remove('active');
    });
  }

  // Demo connection trigger
  if (btnSpDemo) {
    btnSpDemo.addEventListener('click', () => {
      const originalText = btnSpDemo.textContent;
      btnSpDemo.textContent = 'Syncing Playlists...';
      btnSpDemo.disabled = true;
      
      setTimeout(() => {
        localStorage.setItem('spotify_is_demo', 'true');
        localStorage.setItem('spotify_user_name', 'CozyReader_Demo');
        localStorage.removeItem('spotify_is_real');
        localStorage.removeItem('spotify_token');
        
        btnSpDemo.textContent = originalText;
        btnSpDemo.disabled = false;
        if (connModal) connModal.classList.remove('active');
        updateSpotifyUI();
      }, 1000);
    });
  }

  // Real Connection Trigger
  if (btnSpRealConnect) {
    btnSpRealConnect.addEventListener('click', () => {
      const clientId = spClientIdInput.value.trim();
      if (!clientId) {
        alert('Please enter a valid Spotify Developer Client ID.');
        return;
      }
      
      const redirectUri = window.location.origin + '/';
      const scopes = [
        'user-read-currently-playing',
        'user-read-playback-state',
        'user-modify-playback-state'
      ].join(' ');
      
      const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}&show_dialog=true`;
      window.location.href = authUrl;
    });
  }

  updateSpotifyUI();
}
