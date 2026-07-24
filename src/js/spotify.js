export function initSpotify() {
  // DOM Elements
  const playBtn = document.getElementById('sp-play');
  const trackItems = document.querySelectorAll('.sp-track-item');
  const trackNameEl = document.getElementById('sp-track');
  const artistNameEl = document.getElementById('sp-artist');
  const timeCurEl = document.getElementById('sp-time-cur');
  const timeDurEl = document.getElementById('sp-time-dur');
  const progressFill = document.getElementById('sp-bar-fill');
  const albumArt = document.querySelector('.spotify-album-art');
  const loginCta = document.querySelector('.spotify-login-cta');
  
  // Credentials Modal Elements
  const credsModal = document.getElementById('spotify-creds-modal');
  const credsCloseBtn = document.getElementById('spotify-creds-close-btn');
  const spLoginBtn = document.getElementById('sp-login-btn');
  const spotifyCard = document.getElementById('spotify-widget');
  const clientInput = document.getElementById('spotify-client-id');
  const oauthBtn = document.getElementById('spotify-oauth-btn');
  const disconnectBtn = document.getElementById('spotify-disconnect-btn');
  const disconnectSec = document.getElementById('spotify-disconnect-section');

  // Cozy local playlists/tracks for fallback mode
  const localTracks = [
    { name: 'Cozy Rain Lofi', artist: 'ChillHop Music', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { name: 'Autumn Library Jazz', artist: 'Cafe Music BGM', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { name: 'Cottagecore Afternoon', artist: 'Ambiance Sounds', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { name: 'Candlelit Classical', artist: 'Study with Me', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' }
  ];

  // Spotify Track URIs matching the lofi vibes
  const spotifyTracks = [
    { uri: 'spotify:track:4HlFJV71czjLc14E68Oxtr', name: 'Rainy Day', artist: 'Lofi Fruits Music' },
    { uri: 'spotify:track:37r5tM8WwH9152O8wXnN1s', name: 'Cozy Jazz', artist: 'Coffee Shop BGM' },
    { uri: 'spotify:track:0V3wPSppK6mLIHY58CzCzc', name: 'Cottagecore', artist: 'Nature Sounds' },
    { uri: 'spotify:track:5E7t43G5X4e52IkvFzWf0R', name: 'Ambient Piano', artist: 'Lofi Study Chill' }
  ];

  // State Variables
  let currentTrackIdx = 0;
  let isPlaying = false;
  let isSpotifyConnected = false;
  let spotifyPlayer = null;
  let spotifyDeviceId = null;
  let progressInterval = null;

  // Local/Fallback Audio Player
  const bgAudio = new Audio();
  bgAudio.src = localTracks[currentTrackIdx].src;

  // Formatting helpers
  function formatSecs(secs) {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Check URL hash for OAuth redirect token
  function checkUrlForToken() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    if (accessToken) {
      localStorage.setItem('spotify_access_token', accessToken);
      // Clean url hash
      window.history.replaceState("", document.title, window.location.pathname + window.location.search);
      showAlert("Successfully connected to Spotify OAuth!");
    }
  }

  function showAlert(msg) {
    alert(msg);
  }

  // Initial authentication setup
  checkUrlForToken();
  const token = localStorage.getItem('spotify_access_token');
  const storedClientId = localStorage.getItem('spotify_client_id') || '';

  if (clientInput) clientInput.value = storedClientId;

  // Setup UI states
  function updateUIState() {
    const activeToken = localStorage.getItem('spotify_access_token');
    if (activeToken) {
      if (loginCta) loginCta.innerHTML = `<p style="color: #1DB954; font-weight: 600;">Spotify Premium Active</p><button class="spotify-login-btn" id="sp-change-btn" style="background:#333;">Manage Connection</button>`;
      // Re-bind to new change button
      const changeBtn = document.getElementById('sp-change-btn');
      if (changeBtn) {
        changeBtn.addEventListener('click', () => {
          if (credsModal) credsModal.classList.add('active');
        });
      }
      if (disconnectSec) disconnectSec.style.display = 'block';
      if (spotifyCard) spotifyCard.classList.add('spotify-connected');
    } else {
      if (loginCta) {
        loginCta.innerHTML = `<p>Connect your Spotify account for reading playlists</p><button class="spotify-login-btn" id="sp-login-btn">Connect Spotify</button>`;
        const loginBtn = document.getElementById('sp-login-btn');
        if (loginBtn) {
          loginBtn.addEventListener('click', () => {
            if (credsModal) credsModal.classList.add('active');
          });
        }
      }
      if (disconnectSec) disconnectSec.style.display = 'none';
      if (spotifyCard) spotifyCard.classList.remove('spotify-connected');
    }
  }

  // Fallback Player controls
  function updateFallbackUI() {
    const track = localTracks[currentTrackIdx];
    if (trackNameEl) trackNameEl.textContent = track.name;
    if (artistNameEl) artistNameEl.textContent = track.artist;

    trackItems.forEach((item, idx) => {
      item.classList.toggle('sp-active', idx === currentTrackIdx);
    });

    if (albumArt) {
      if (isPlaying) {
        albumArt.textContent = '🎵';
        albumArt.style.animation = 'musicPulse 1.5s infinite ease-in-out';
      } else {
        albumArt.style.animation = 'none';
      }
    }
    
    if (playBtn) playBtn.textContent = isPlaying ? '⏸' : '▶️';
  }

  function playFallbackTrack() {
    if (bgAudio.src !== localTracks[currentTrackIdx].src) {
      bgAudio.src = localTracks[currentTrackIdx].src;
    }
    bgAudio.play().then(() => {
      isPlaying = true;
      updateFallbackUI();
    }).catch(err => {
      console.warn("Audio playback blocked:", err);
      isPlaying = false;
      updateFallbackUI();
    });
  }

  function pauseFallbackTrack() {
    bgAudio.pause();
    isPlaying = false;
    updateFallbackUI();
  }

  // Spotify Web Playback SDK logic
  function initSpotifyPlayer(accessToken) {
    if (!window.Spotify) {
      console.warn("Spotify SDK script not loaded yet.");
      return;
    }

    spotifyPlayer = new Spotify.Player({
      name: 'BetterReads Cozy Nook',
      getOAuthToken: cb => { cb(accessToken); },
      volume: 0.5
    });

    // Error handling
    spotifyPlayer.addListener('initialization_error', ({ message }) => {
      console.error('Initialization Error:', message);
      switchToFallback("Spotify SDK initialization failed. Using cozy lofi fallback.");
    });
    
    spotifyPlayer.addListener('authentication_error', ({ message }) => {
      console.error('Authentication Error:', message);
      localStorage.removeItem('spotify_access_token');
      updateUIState();
      switchToFallback("Authentication failed. Please reconnect Spotify.");
    });
    
    spotifyPlayer.addListener('account_error', ({ message }) => {
      console.error('Account Error:', message);
      switchToFallback("Spotify Premium account is required for Web SDK playback. Playing cozy lofi instead.");
    });
    
    spotifyPlayer.addListener('playback_error', ({ message }) => {
      console.error('Playback Error:', message);
    });

    // Playback status updates
    spotifyPlayer.addListener('player_state_changed', state => {
      if (!state) return;

      isPlaying = !state.paused;
      if (playBtn) playBtn.textContent = isPlaying ? '⏸' : '▶️';

      const currentTrack = state.track_window.current_track;
      if (currentTrack) {
        if (trackNameEl) trackNameEl.textContent = currentTrack.name;
        if (artistNameEl) artistNameEl.textContent = currentTrack.artists.map(a => a.name).join(', ');
        
        if (albumArt && currentTrack.album.images && currentTrack.album.images[0]) {
          albumArt.innerHTML = `<img src="${currentTrack.album.images[0].url}" style="width:100%; height:100%; border-radius:inherit; object-fit:cover;" />`;
          albumArt.style.animation = isPlaying ? 'musicPulse 1.5s infinite ease-in-out' : 'none';
        }
      }

      // Track duration & progress bar
      if (timeDurEl) timeDurEl.textContent = formatSecs(state.duration / 1000);
      
      clearInterval(progressInterval);
      if (isPlaying) {
        let currentPosMs = state.position;
        progressInterval = setInterval(() => {
          currentPosMs += 1000;
          if (timeCurEl) timeCurEl.textContent = formatSecs(currentPosMs / 1000);
          if (progressFill && state.duration) {
            progressFill.style.width = `${Math.min(100, (currentPosMs / state.duration) * 100)}%`;
          }
        }, 1000);
      } else {
        if (timeCurEl) timeCurEl.textContent = formatSecs(state.position / 1000);
        if (progressFill && state.duration) {
          progressFill.style.width = `${(state.position / state.duration) * 100}%`;
        }
      }
    });

    // Ready
    spotifyPlayer.addListener('ready', ({ device_id }) => {
      console.log('Ready with Device ID', device_id);
      spotifyDeviceId = device_id;
      isSpotifyConnected = true;
      pauseFallbackTrack();
      updateUIState();
    });

    // Not Ready
    spotifyPlayer.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline', device_id);
      isSpotifyConnected = false;
    });

    // Connect
    spotifyPlayer.connect();
  }

  function switchToFallback(message) {
    if (message) console.warn(message);
    isSpotifyConnected = false;
    updateUIState();
    updateFallbackUI();
  }

  // Trigger Spotify remote play
  async function playSpotifyTrackUri(uri) {
    const activeToken = localStorage.getItem('spotify_access_token');
    if (!activeToken || !spotifyDeviceId) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ uris: [uri] })
      });
    } catch (err) {
      console.error("Error triggering Spotify track playback:", err);
    }
  }

  // Initialize playback mode depending on availability
  if (token) {
    // If the SDK is already loaded
    if (window.Spotify && window.Spotify.Player) {
      initSpotifyPlayer(token);
    } else {
      // Wait for SDK load callback
      window.onSpotifyWebPlaybackSDKReady = () => {
        initSpotifyPlayer(token);
      };
    }
  } else {
    switchToFallback();
  }

  // Event Listeners for player buttons
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (isSpotifyConnected && spotifyPlayer) {
        spotifyPlayer.togglePlay();
      } else {
        if (isPlaying) {
          pauseFallbackTrack();
        } else {
          playFallbackTrack();
        }
      }
    });
  }

  const spNext = document.getElementById('sp-next');
  if (spNext) {
    spNext.addEventListener('click', () => {
      if (isSpotifyConnected && spotifyPlayer) {
        spotifyPlayer.nextTrack();
      } else {
        currentTrackIdx = (currentTrackIdx + 1) % localTracks.length;
        if (isPlaying) playFallbackTrack();
        else updateFallbackUI();
      }
    });
  }

  const spPrev = document.getElementById('sp-prev');
  if (spPrev) {
    spPrev.addEventListener('click', () => {
      if (isSpotifyConnected && spotifyPlayer) {
        spotifyPlayer.previousTrack();
      } else {
        currentTrackIdx = (currentTrackIdx - 1 + localTracks.length) % localTracks.length;
        if (isPlaying) playFallbackTrack();
        else updateFallbackUI();
      }
    });
  }

  // Clicking track list items
  trackItems.forEach((item, idx) => {
    item.addEventListener('click', () => {
      currentTrackIdx = idx;
      if (isSpotifyConnected) {
        playSpotifyTrackUri(spotifyTracks[idx].uri);
      } else {
        playFallbackTrack();
      }
    });
  });

  // Timeline seeking
  const progressTrack = document.getElementById('sp-progress-track');
  if (progressTrack) {
    progressTrack.addEventListener('click', e => {
      if (isSpotifyConnected && spotifyPlayer) {
        spotifyPlayer.getCurrentState().then(state => {
          if (!state) return;
          const rect = progressTrack.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const percentage = Math.max(0, Math.min(1, clickX / rect.width));
          spotifyPlayer.seek(percentage * state.duration);
        });
      } else {
        if (!bgAudio.duration) return;
        const rect = progressTrack.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        bgAudio.currentTime = percentage * bgAudio.duration;
      }
    });
  }

  // Fallback Audio events
  bgAudio.addEventListener('loadedmetadata', () => {
    if (!isSpotifyConnected && timeDurEl) {
      timeDurEl.textContent = formatSecs(bgAudio.duration);
    }
  });

  bgAudio.addEventListener('timeupdate', () => {
    if (!isSpotifyConnected) {
      if (timeCurEl) timeCurEl.textContent = formatSecs(bgAudio.currentTime);
      if (progressFill && bgAudio.duration) {
        progressFill.style.width = `${(bgAudio.currentTime / bgAudio.duration) * 100}%`;
      }
    }
  });

  bgAudio.addEventListener('ended', () => {
    if (!isSpotifyConnected) {
      currentTrackIdx = (currentTrackIdx + 1) % localTracks.length;
      playFallbackTrack();
    }
  });

  // Credentials Modal logic
  if (spLoginBtn) {
    spLoginBtn.addEventListener('click', () => {
      if (credsModal) credsModal.classList.add('active');
    });
  }

  if (credsCloseBtn) {
    credsCloseBtn.addEventListener('click', () => {
      if (credsModal) credsModal.classList.remove('active');
    });
  }

  if (credsModal) {
    credsModal.addEventListener('click', (e) => {
      if (e.target === credsModal) {
        credsModal.classList.remove('active');
      }
    });
  }



  // Trigger OAuth login redirect
  if (oauthBtn && clientInput) {
    oauthBtn.addEventListener('click', () => {
      const clientId = clientInput.value.trim();
      if (!clientId) {
        showAlert("Please enter your Spotify Client ID.");
        return;
      }
      localStorage.setItem('spotify_client_id', clientId);
      const redirectUri = window.location.origin + '/';
      const scopes = [
        'streaming',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
        'user-read-email',
        'user-read-private'
      ].join(' ');

      const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
      window.location.href = authUrl;
    });
  }

  // Disconnect Spotify
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_client_id');
      if (spotifyPlayer) {
        spotifyPlayer.disconnect();
      }
      if (credsModal) credsModal.classList.remove('active');
      showAlert("Disconnected from Spotify. Reverting to cozy lofi fallback.");
      location.reload();
    });
  }

  // Setup initial UI states
  updateUIState();
  updateFallbackUI();
}
