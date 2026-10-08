(function () {
  'use strict';

  const supabase = window.supabaseClient;
  const config = window.APP_CONFIG || {};
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePassword = document.getElementById('togglePassword');
  const loginButton = document.getElementById('loginButton');
  const loginError = document.getElementById('loginError');
  const toast = document.getElementById('toast');
  let toastTimer = 0;

  function logDev(...args) {
    if (config.DEV_MODE) console.info('[AdminLogin]', ...args);
  }

  function showToast(message, type = 'info') {
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function setLoading(loading) {
    loginButton.disabled = loading;
    loginButton.classList.toggle('loading', loading);
    emailInput.disabled = loading;
    passwordInput.disabled = loading;
    togglePassword.disabled = loading;
  }

  function messageForError(error) {
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('invalid login credentials')) return 'Email hoặc mật khẩu chưa đúng.';
    if (msg.includes('email not confirmed')) return 'Tài khoản chưa xác nhận email.';
    if (msg.includes('failed to fetch')) return 'Không kết nối được Supabase. Kiểm tra mạng nhé.';
    if (!window.APP_CONFIG_STATUS?.valid) return 'Chủ website chưa cấu hình Supabase trong js/config.js.';
    return 'Không thể đăng nhập lúc này. Vui lòng thử lại.';
  }

  async function checkAdmin(userId) {
    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      logDev('Admin lookup error:', error);
      throw error;
    }
    return Boolean(data?.user_id);
  }

  togglePassword?.addEventListener('click', () => {
    const nextType = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = nextType;
    togglePassword.textContent = nextType === 'password' ? '👁' : '🙈';
    togglePassword.setAttribute('aria-label', nextType === 'password' ? 'Hiện mật khẩu' : 'Ẩn mật khẩu');
    togglePassword.setAttribute('aria-pressed', String(nextType === 'text'));
  });

  supabase?.auth.getSession().then(async ({ data, error }) => {
    if (error || !data?.session) return;
    try {
      if (await checkAdmin(data.session.user.id)) {
        window.location.replace('admin.html');
      } else {
        await supabase.auth.signOut();
      }
    } catch (lookupError) {
      logDev('Session admin check failed:', lookupError);
      await supabase.auth.signOut().catch(() => {});
    }
  });

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      loginError.textContent = 'Vui lòng nhập đầy đủ email và mật khẩu.';
      return;
    }
    if (!supabase || !window.APP_CONFIG_STATUS?.valid) {
      loginError.textContent = 'Cấu hình Supabase chưa hoàn tất. Mở js/config.js để kiểm tra.';
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data?.user) throw new Error('NO_USER');

      const isAdmin = await checkAdmin(data.user.id);
      if (!isAdmin) {
        await supabase.auth.signOut();
        loginError.textContent = 'Tài khoản này không có quyền admin.';
        showToast('Bạn không có quyền truy cập dashboard.', 'error');
        setLoading(false);
        return;
      }

      showToast('Đăng nhập thành công. Đang mở dashboard…', 'success');
      window.setTimeout(() => window.location.replace('admin.html'), 350);
    } catch (error) {
      console.error('[AdminLogin] Login failed:', error);
      loginError.textContent = messageForError(error);
      setLoading(false);
    }
  });
})();
