/**
 * ============================================================
 * DEPT. Q. BANK — auth.js
 * ============================================================
 * Global `Auth` object, styled the same way as `Storage` in
 * storage.js: a plain object of methods, no build step, no
 * module system. Depends on supabaseClient.js being loaded first.
 */

const AUTH_KEYS = {
  GUEST_MODE: 'dqb_guest_mode',
};

const UNIVERSITY_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@med\.znu\.edu\.eg$/;

const Auth = {

  // ─── Guest mode flag ────────────────────────────────────────
  isGuest() {
    return localStorage.getItem(AUTH_KEYS.GUEST_MODE) === 'true';
  },

  continueAsGuest() {
    localStorage.setItem(AUTH_KEYS.GUEST_MODE, 'true');
    return { success: true, mode: 'guest' };
  },

  _clearGuestFlag() {
    localStorage.removeItem(AUTH_KEYS.GUEST_MODE);
  },

  // ─── Session helpers ────────────────────────────────────────
  async getSession() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.warn('[Auth] getSession failed:', error);
      return null;
    }
    return data.session;
  },

  async getCurrentUser() {
    const session = await this.getSession();
    return session ? session.user : null;
  },

  async isLoggedIn() {
    return (await this.getSession()) !== null;
  },

  onAuthStateChange(callback) {
    // callback(event, session) — 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | ...
    return supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') this._clearGuestFlag();
      callback(event, session);
    });
  },

  // ─── Sign up ────────────────────────────────────────────────
  async signUpUser(email, password) {
    const trimmedEmail = (email || '').trim().toLowerCase();

    // Frontend validation — immediate UX feedback only.
    // The real enforcement is the BEFORE INSERT trigger in Postgres;
    // this check never substitutes for it.
    if (!UNIVERSITY_EMAIL_REGEX.test(trimmedEmail)) {
      return {
        success: false,
        state: 'invalid_email',
        message: 'Please use your university email (@med.znu.edu.eg).',
      };
    }

    if (!password || password.length < 8) {
      return {
        success: false,
        state: 'invalid_password',
        message: 'Password must be at least 8 characters.',
      };
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email: trimmedEmail,
      password,
    });

    if (error) {
      // Postgres trigger rejection surfaces here too, as a defense-in-depth
      // backstop in case the regex above is ever bypassed or out of sync.
      const rejectedByDomainRule =
        /med\.znu\.edu\.eg/i.test(error.message || '') ||
        error.message?.includes('Database error saving new user');

      return {
        success: false,
        state: rejectedByDomainRule ? 'invalid_email' : 'signup_error',
        message: rejectedByDomainRule
          ? 'Please use your university email (@med.znu.edu.eg).'
          : (error.message || 'Sign up failed. Please try again.'),
      };
    }

    // Custom SMTP is in use, so no session exists yet — the user
    // must click the verification link before they can log in.
    // Never treat `data.session` as a login here.
    return {
      success: true,
      state: 'verification_pending',
      message: 'Please check your email to verify your account.',
      user: data.user,
    };
  },

  // ─── Log in ─────────────────────────────────────────────────
  async logInUser(email, password) {
    const trimmedEmail = (email || '').trim().toLowerCase();

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      const unverified = /email not confirmed/i.test(error.message || '');
      return {
        success: false,
        state: unverified ? 'email_not_verified' : 'login_error',
        message: unverified
          ? 'Please verify your email before logging in.'
          : 'Incorrect email or password.',
      };
    }

    this._clearGuestFlag();
    return { success: true, state: 'logged_in', session: data.session, user: data.user };
  },

  // ─── Log out ────────────────────────────────────────────────
  async logOutUser() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.warn('[Auth] signOut failed:', error);
      return { success: false, message: error.message };
    }
    return { success: true };
  },
};
