import { supabase, store, syncShelves } from './store.js';

export function initAuth() {
  const authModal = document.getElementById('auth-modal');
  const authCloseBtn = document.getElementById('auth-close-btn');
  const navAvatar = document.getElementById('nav-avatar');
  const avatarDropdown = document.getElementById('avatar-dropdown');
  const btnSignout = document.getElementById('btn-signout');
  const navGetStarted = document.getElementById('nav-get-started');
  const ctaSignup = document.getElementById('cta-signup');
  const ctaSignin = document.getElementById('cta-signin');
  
  // Forms and Tabs
  const authFormSignin = document.getElementById('auth-form-signin');
  const authFormSignup = document.getElementById('auth-form-signup');
  const authFormStep2 = document.getElementById('auth-form-step2');
  
  const authStep1 = document.getElementById('auth-step-1');
  const authStep2 = document.getElementById('auth-step-2');
  
  const tabSignin = document.getElementById('tab-signin');
  const tabSignup = document.getElementById('tab-signup');
  
  const btnGoogleAuth = document.getElementById('btn-google-auth');
  const btnBackStep1 = document.getElementById('btn-back-step1');
  const avatarOptions = document.querySelectorAll('.avatar-option');
  
  let selectedAvatar = '🍵';
  let isOAuthProfileCompletion = false;

  // Toggle tab
  function switchTab(mode) {
    if (mode === 'signin') {
      if (tabSignin) tabSignin.classList.add('active');
      if (tabSignup) tabSignup.classList.remove('active');
      if (authFormSignin) authFormSignin.style.display = 'block';
      if (authFormSignup) authFormSignup.style.display = 'none';
    } else {
      if (tabSignin) tabSignin.classList.remove('active');
      if (tabSignup) tabSignup.classList.add('active');
      if (authFormSignin) authFormSignin.style.display = 'none';
      if (authFormSignup) authFormSignup.style.display = 'block';
    }
  }

  if (tabSignin) tabSignin.addEventListener('click', () => switchTab('signin'));
  if (tabSignup) tabSignup.addEventListener('click', () => switchTab('signup'));

  window.showAuthModal = function(initialMode = 'signin') {
    if (authModal) authModal.classList.add('active');
    if (authStep1) authStep1.style.display = 'block';
    if (authStep2) authStep2.style.display = 'none';
    switchTab(initialMode);
  };

  function closeAuthModal() {
    if (authModal) authModal.classList.remove('active');
  }

  // Toggle avatar dropdown menu
  if (navAvatar) {
    navAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      if (store.isLoggedIn) {
        if (avatarDropdown) avatarDropdown.classList.toggle('active');
      } else {
        window.showAuthModal('signin');
      }
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    if (avatarDropdown) avatarDropdown.classList.remove('active');
  });

  // Handle Sign Out
  if (btnSignout) {
    btnSignout.addEventListener('click', async () => {
      const { error } = await supabase.auth.signOut();
      if (error) alert(error.message);
    });
  }

  function completeLogin(avatarOrText) {
    store.isLoggedIn = true;
    closeAuthModal();
    if (navAvatar) {
      navAvatar.style.background = 'var(--sage)';
      navAvatar.title = 'Profile (Click to Sign Out)';
      navAvatar.textContent = avatarOrText;
    }
    if (navGetStarted) {
      navGetStarted.style.display = 'none';
    }
    syncShelves();
  }

  function showProfileCompletionStep() {
    isOAuthProfileCompletion = true;
    window.showAuthModal();
    if (authStep1) authStep1.style.display = 'none';
    if (authStep2) authStep2.style.display = 'block';
  }

  if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  const triggerAuth = (e) => {
    if (!store.isLoggedIn) {
      e.preventDefault();
      window.showAuthModal('signup');
    }
  };

  if (navGetStarted) navGetStarted.addEventListener('click', triggerAuth);
  if (ctaSignup) ctaSignup.addEventListener('click', triggerAuth);
  if (ctaSignin) ctaSignin.addEventListener('click', (e) => {
    if (!store.isLoggedIn) {
      e.preventDefault();
      window.showAuthModal('signin');
    }
  });

  if (btnGoogleAuth) {
    btnGoogleAuth.addEventListener('click', async () => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin }
        });
        if (error) alert(error.message);
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Handle Sign In submission
  if (authFormSignin) {
    authFormSignin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signin-email').value;
      const password = document.getElementById('signin-password').value;
      
      const submitBtn = authFormSignin.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Signing In...';
      submitBtn.disabled = true;

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      submitBtn.textContent = originalText;
      submitBtn.disabled = false;

      if (error) {
        alert(error.message);
        return;
      }

      store.currentUser = data.user;
      // Fetch or setup profile
      const { data: profile } = await supabase.from('profiles').select('username, avatar').eq('id', data.user.id).single();
      if (profile && profile.avatar) {
        localStorage.setItem('betterreads_user_profile', JSON.stringify({
          username: profile.username || 'you.reading',
          avatar: profile.avatar
        }));
        completeLogin(profile.avatar);
      } else {
        // If logged in but no profile, complete profile
        showProfileCompletionStep();
      }
    });
  }

  // Handle Sign Up submission
  if (authFormSignup) {
    authFormSignup.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;

      const submitBtn = authFormSignup.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Registering...';
      submitBtn.disabled = true;

      const { data, error } = await supabase.auth.signUp({ email, password });

      submitBtn.textContent = originalText;
      submitBtn.disabled = false;

      if (error) {
        alert(error.message);
        return;
      }

      // Automatically log them in, or prompt if auto-login is disabled.
      if (data.user) {
        store.currentUser = data.user;
        // Go to Step 2
        if (authStep1) authStep1.style.display = 'none';
        if (authStep2) authStep2.style.display = 'block';
        isOAuthProfileCompletion = false;
      } else {
        alert('Please check your email to confirm your registration.');
      }
    });
  }

  if (btnBackStep1) {
    btnBackStep1.addEventListener('click', () => {
      if (authStep2) authStep2.style.display = 'none';
      if (authStep1) authStep1.style.display = 'block';
    });
  }

  avatarOptions.forEach(option => {
    option.addEventListener('click', () => {
      avatarOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      selectedAvatar = option.dataset.avatar;
    });
  });

  if (authFormStep2) {
    authFormStep2.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('auth-username').value;
      const submitBtn = authFormStep2.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Saving Profile...';
      submitBtn.disabled = true;

      // Verify session exists
      if (!store.currentUser) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) store.currentUser = session.user;
      }

      if (!store.currentUser) {
        alert('No user session found. Please sign up or sign in again.');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }

      const { error } = await supabase.from('profiles').upsert({
        id: store.currentUser.id,
        username: username,
        avatar: selectedAvatar
      });

      if (error) {
        alert('Error saving profile: ' + error.message);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }

      localStorage.setItem('betterreads_user_profile', JSON.stringify({
        username: username,
        avatar: selectedAvatar
      }));

      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      completeLogin(selectedAvatar);
    });
  }

  // Initial check
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      store.isLoggedIn = true;
      store.currentUser = session.user;
      supabase.from('profiles').select('username, avatar').eq('id', store.currentUser.id).single()
        .then(({ data: profile }) => {
          if (profile && profile.avatar) {
            localStorage.setItem('betterreads_user_profile', JSON.stringify({
              username: profile.username || 'you.reading',
              avatar: profile.avatar
            }));
            completeLogin(profile.avatar);
          }
          else showProfileCompletionStep();
        });
    } else {
        syncShelves();
    }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      store.isLoggedIn = false;
      store.currentUser = null;
      if (navAvatar) {
        navAvatar.style.background = '';
        navAvatar.title = 'Sign in';
        navAvatar.innerHTML = `<svg class="icon-user" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
      }
      if (navGetStarted) navGetStarted.style.display = 'inline-flex';
      syncShelves();
    }
  });
}
