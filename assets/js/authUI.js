/**
 * ============================================================
 * DEPT. Q. BANK — authUI.js
 * ============================================================
 * Wires the #auth-modal to Auth. Mirrors the existing
 * #wipe-modal open/close pattern in app.js.
 */

(function () {
  const modal         = document.getElementById('auth-modal');
  const triggerBtn     = document.getElementById('auth-trigger-btn');
  const tabs           = document.querySelectorAll('[data-auth-tab]');
  const loginForm      = document.getElementById('auth-login-form');
  const signupForm     = document.getElementById('auth-signup-form');
  const loginError     = document.getElementById('login-error');
  const signupError    = document.getElementById('signup-error');
  const signupSuccess  = document.getElementById('signup-success');

  function openModal()  { modal.style.display = 'flex'; }
  function closeModal() { modal.style.display = 'none'; }

  function setActiveTab(name) {
    tabs.forEach(t => t.classList.toggle('is-active', t.dataset.authTab === name));
    loginForm.hidden  = name !== 'login';
    signupForm.hidden = name !== 'signup';
  }

  async function refreshTriggerLabel() {
    const user = await Auth.getCurrentUser();
    triggerBtn.textContent = user ? user.email.split('@')[0] : 'Sign In';
    triggerBtn.title = user ? 'Signed in — click to log out' : 'Sign in';
  }

  triggerBtn.addEventListener('click', async () => {
    const user = await Auth.getCurrentUser();
    if (user) {
      await Auth.logOutUser();
      await refreshTriggerLabel();
      return;
    }
    setActiveTab('login');
    openModal();
  });

  tabs.forEach(t => t.addEventListener('click', () => setActiveTab(t.dataset.authTab)));
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  [document.getElementById('guest-btn-login'), document.getElementById('guest-btn-signup')]
    .forEach(btn => btn.addEventListener('click', () => {
      Auth.continueAsGuest();
      closeModal();
    }));

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    const email    = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const result   = await Auth.logInUser(email, password);
    if (!result.success) {
      loginError.textContent = result.message;
      loginError.hidden = false;
      return;
    }
    closeModal();
    await refreshTriggerLabel();
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.hidden = true;
    signupSuccess.hidden = true;
    const email    = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const result   = await Auth.signUpUser(email, password);
    if (!result.success) {
      signupError.textContent = result.message;
      signupError.hidden = false;
      return;
    }
    signupSuccess.textContent = result.message; // "Please check your email to verify your account."
    signupSuccess.hidden = false;
    signupForm.reset();
  });

  Auth.onAuthStateChange(() => refreshTriggerLabel());
  document.addEventListener('DOMContentLoaded', refreshTriggerLabel);
})();
