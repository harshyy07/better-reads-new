import { supabase, store, syncShelves } from './store.js';

export function initAuth() {
  const authModal = document.getElementById('auth-modal');
  const authCloseBtn = document.getElementById('auth-close-btn');
  const navAvatar = document.getElementById('nav-avatar');
  const navGetStarted = document.getElementById('nav-get-started');
  const ctaSignup = document.getElementById('cta-signup');
  const ctaSignin = document.getElementById('cta-signin');
  const authFormStep1 = document.getElementById('auth-form-step1');
  const authFormStep2 = document.getElementById('auth-form-step2');
  const authStep1 = document.getElementById('auth-step-1');
  const authStep2 = document.getElementById('auth-step-2');
  const btnGoogleAuth = document.getElementById('btn-google-auth');
  const btnBackStep1 = document.getElementById('btn-back-step1');
  const authEmailInput = document.getElementById('auth-email');
  const authCodeMessage = document.getElementById('auth-code-message');
  const avatarOptions = document.querySelectorAll('.avatar-option');
  let selectedAvatar = '🍵';
  let isOAuthProfileCompletion = false;

  window.showAuthModal = function() {
    if (authModal) authModal.classList.add('active');
    if (authStep1) authStep1.style.display = 'block';
    if (authStep2) authStep2.style.display = 'none';
  };

  function closeAuthModal() {
    if (authModal) authModal.classList.remove('active');
  }

  function completeLogin(avatarOrText) {
    store.isLoggedIn = true;
    closeAuthModal();
    if (navAvatar) {
      navAvatar.style.background = 'var(--sage)';
      navAvatar.title = 'Profile';
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
    if (authCodeMessage) authCodeMessage.textContent = "Please complete your profile to continue.";
    const authCodeInput = document.getElementById('auth-code');
    if (authCodeInput) {
      authCodeInput.required = false;
      authCodeInput.parentElement.style.display = 'none';
    }
    const authPasswordInput = document.getElementById('auth-password');
    if (authPasswordInput) {
      authPasswordInput.required = false;
      authPasswordInput.parentElement.style.display = 'none';
    }
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
      window.showAuthModal();
    }
  };

  if (navAvatar) navAvatar.addEventListener('click', triggerAuth);
  if (navGetStarted) navGetStarted.addEventListener('click', triggerAuth);
  if (ctaSignup) ctaSignup.addEventListener('click', triggerAuth);
  if (ctaSignin) ctaSignin.addEventListener('click', triggerAuth);

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

  if (authFormStep1) {
    authFormStep1.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = authEmailInput ? authEmailInput.value : '';
      if (!email) return;
      
      const submitBtn = authFormStep1.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;

      const { error } = await supabase.auth.signInWithOtp({ email });

      submitBtn.textContent = originalText;
      submitBtn.disabled = false;

      if (error) {
        alert(error.message);
        return;
      }
      if (authStep1) authStep1.style.display = 'none';
      if (authStep2) authStep2.style.display = 'block';
      if (authCodeMessage) authCodeMessage.textContent = `We sent a code to ${email}.`;
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
      submitBtn.textContent = 'Verifying...';
      submitBtn.disabled = true;

      if (!isOAuthProfileCompletion) {
        const email = authEmailInput.value;
        const code = document.getElementById('auth-code').value;
        const password = document.getElementById('auth-password').value;

        const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
        if (error) {
          alert(error.message);
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
          return;
        }
        store.currentUser = data.user;
        if (password) await supabase.auth.updateUser({ password });
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) store.currentUser = session.user;
      }

      await supabase.from('profiles').upsert({
        id: store.currentUser.id,
        username: username,
        avatar: selectedAvatar
      });

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
      supabase.from('profiles').select('avatar').eq('id', store.currentUser.id).single()
        .then(({ data: profile }) => {
          if (profile && profile.avatar) completeLogin(profile.avatar);
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
        navAvatar.textContent = '🌸';
      }
      if (navGetStarted) navGetStarted.style.display = 'inline-flex';
      syncShelves();
    }
  });
}
