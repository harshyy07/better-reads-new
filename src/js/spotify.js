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
  if (loginCta) loginCta.style.display = 'none';

  const playlistTracks = [
    { name: 'Acoustic Rain', artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { name: 'Midnight Study', artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { name: 'Coffee Shop Jazz', artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { name: 'Lofi Library', artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' }
  ];

  let currentTrackIdx = 0;
  let isPlaying = false;

  const bgAudio = new Audio();
  bgAudio.src = playlistTracks[currentTrackIdx].src;

  function formatSecs(secs) {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function updateSpotifyUI() {
    const track = playlistTracks[currentTrackIdx];
    if (trackNameEl) trackNameEl.textContent = track.name;
    if (artistNameEl) artistNameEl.textContent = track.artist;

    trackItems.forEach((item, idx) => {
      item.classList.toggle('sp-active', idx === currentTrackIdx);
    });

    if (albumArt) {
      if (isPlaying) {
        albumArt.style.animation = 'musicPulse 1.5s infinite ease-in-out';
      } else {
        albumArt.style.animation = 'none';
      }
    }
    
    if (playBtn) playBtn.textContent = isPlaying ? '⏸' : '▶️';
  }

  function playSpotifyTrack() {
    if (bgAudio.src !== playlistTracks[currentTrackIdx].src) {
      bgAudio.src = playlistTracks[currentTrackIdx].src;
    }
    bgAudio.play().then(() => {
      isPlaying = true;
      updateSpotifyUI();
    }).catch(err => {
      console.warn("Audio playback blocked by browser:", err);
      isPlaying = false;
      updateSpotifyUI();
    });
  }

  function pauseSpotifyTrack() {
    bgAudio.pause();
    isPlaying = false;
    updateSpotifyUI();
  }

  function nextSpotifyTrack() {
    currentTrackIdx = (currentTrackIdx + 1) % playlistTracks.length;
    if (isPlaying) {
      playSpotifyTrack();
    } else {
      bgAudio.src = playlistTracks[currentTrackIdx].src;
      updateSpotifyUI();
    }
  }

  function prevSpotifyTrack() {
    currentTrackIdx = (currentTrackIdx - 1 + playlistTracks.length) % playlistTracks.length;
    if (isPlaying) {
      playSpotifyTrack();
    } else {
      bgAudio.src = playlistTracks[currentTrackIdx].src;
      updateSpotifyUI();
    }
  }

  bgAudio.addEventListener('loadedmetadata', () => {
    if (timeDurEl) timeDurEl.textContent = formatSecs(bgAudio.duration);
  });

  bgAudio.addEventListener('timeupdate', () => {
    if (timeCurEl) timeCurEl.textContent = formatSecs(bgAudio.currentTime);
    if (progressFill && bgAudio.duration) {
      progressFill.style.width = `${(bgAudio.currentTime / bgAudio.duration) * 100}%`;
    }
  });

  bgAudio.addEventListener('ended', nextSpotifyTrack);

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (isPlaying) {
        pauseSpotifyTrack();
      } else {
        playSpotifyTrack();
      }
    });
  }

  const spNext = document.getElementById('sp-next');
  if (spNext) spNext.addEventListener('click', nextSpotifyTrack);

  const spPrev = document.getElementById('sp-prev');
  if (spPrev) spPrev.addEventListener('click', prevSpotifyTrack);

  trackItems.forEach((item, idx) => {
    item.addEventListener('click', () => {
      currentTrackIdx = idx;
      playSpotifyTrack();
    });
  });

  const progressTrack = document.getElementById('sp-progress-track');
  if (progressTrack) {
    progressTrack.addEventListener('click', e => {
      if (!bgAudio.duration) return;
      const rect = progressTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      bgAudio.currentTime = percentage * bgAudio.duration;
    });
  }

  updateSpotifyUI();
}
