(function () {
  'use strict';

  const supabase = window.supabaseClient;
  const config = window.APP_CONFIG || {};
  const root = document.getElementById('dashboardRoot');
  const totalCount = document.getElementById('totalCount');
  const todayCount = document.getElementById('todayCount');
  const realtimeState = document.getElementById('realtimeState');
  const listMeta = document.getElementById('listMeta');
  const body = document.getElementById('consentBody');
  const tableWrap = document.getElementById('tableWrap');
  const emptyState = document.getElementById('emptyState');
  const errorState = document.getElementById('errorState');
  const errorStateText = document.getElementById('errorStateText');
  const searchInput = document.getElementById('searchInput');
  const refreshButton = document.getElementById('refreshButton');
  const sortButton = document.getElementById('sortButton');
  const logoutButton = document.getElementById('logoutButton');
  const retryButton = document.getElementById('retryButton');
  const notificationButton = document.getElementById('notificationButton');
  const toast = document.getElementById('toast');

  let consents = [];
  let newestFirst = true;
  let currentChannel = null;
  let toastTimer = 0;
  let initialized = false;

  function logDev(...args) {
    if (config.DEV_MODE) console.info('[Admin]', ...args);
  }

  function showToast(message, type = 'info') {
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 4500);
  }

  function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).format(date).replace(',', '');
  }

  function isToday(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const parts = (value) => new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(value);
    return parts(date) === parts(now);
  }

  function safeText(value) {
    return String(value ?? '');
  }

  function getFilteredRows() {
    const term = searchInput.value.trim().toLocaleLowerCase('vi-VN');
    const rows = term
      ? consents.filter((row) => safeText(row.name).toLocaleLowerCase('vi-VN').includes(term))
      : [...consents];
    rows.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return newestFirst ? timeB - timeA : timeA - timeB;
    });
    return rows;
  }

  function render() {
    const rows = getFilteredRows();
    body.innerHTML = '';
    rows.forEach((row, index) => {
      const tr = document.createElement('tr');
      const numberCell = document.createElement('td');
      const nameCell = document.createElement('td');
      const statusCell = document.createElement('td');
      const timeCell = document.createElement('td');

      numberCell.textContent = String(index + 1).padStart(2, '0');
      nameCell.textContent = safeText(row.name);
      timeCell.textContent = formatDateTime(row.created_at);

      const badge = document.createElement('span');
      badge.className = 'status-badge';
      badge.textContent = row.status === 'agreed' ? 'ĐÃ ĐỒNG Ý ❤️' : safeText(row.status).toUpperCase();
      statusCell.appendChild(badge);

      tr.append(numberCell, nameCell, statusCell, timeCell);
      body.appendChild(tr);
    });

    const hasAnyRows = consents.length > 0;
    const hasFilteredRows = rows.length > 0;
    emptyState.hidden = hasAnyRows || !initialized || Boolean(errorState && !errorState.hidden);
    if (!hasAnyRows && initialized && !errorState.hidden) emptyState.hidden = false;
    if (hasAnyRows && !hasFilteredRows) {
      emptyState.hidden = false;
      emptyState.querySelector('h3').textContent = 'Không tìm thấy tên phù hợp';
      emptyState.querySelector('p').textContent = 'Thử một từ khóa khác nhé.';
    } else if (!hasAnyRows) {
      emptyState.querySelector('h3').textContent = 'Chưa có ai nói YES...';
      emptyState.querySelector('p').textContent = 'Hãy gửi link cho người đặc biệt và chờ một khoảnh khắc thật đẹp.';
    }

    totalCount.textContent = String(consents.length);
    todayCount.textContent = String(consents.filter((row) => isToday(row.created_at)).length);
    listMeta.textContent = hasAnyRows
      ? `${rows.length}/${consents.length} câu trả lời được hiển thị`
      : initialized ? 'Chưa có dữ liệu' : 'Đang tải dữ liệu…';
  }

  function showError(message) {
    errorState.hidden = false;
    errorStateText.textContent = message;
    tableWrap.classList.add('has-error');
    emptyState.hidden = true;
  }

  function clearError() {
    errorState.hidden = true;
    tableWrap.classList.remove('has-error');
  }

  async function getCurrentSession() {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  }

  async function assertAdmin(session) {
    if (!session?.user?.id) return false;
    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (error) {
      logDev('Admin assert error:', error);
      throw error;
    }
    return Boolean(data?.user_id);
  }

  async function loadConsents() {
    if (!supabase || !window.APP_CONFIG_STATUS?.valid) {
      throw new Error('CONFIG_INVALID');
    }
    const { data, error } = await supabase
      .from('consents')
      .select('id,name,status,created_at,user_agent')
      .order('created_at', { ascending: false });
    if (error) {
      logDev('Consent query error:', error);
      throw error;
    }
    consents = Array.isArray(data) ? data : [];
  }

  async function refresh() {
    clearError();
    refreshButton.disabled = true;
    refreshButton.classList.add('spinning');
    try {
      const session = await getCurrentSession();
      if (!session) {
        window.location.replace('admin-login.html');
        return;
      }
      if (!(await assertAdmin(session))) {
        await supabase.auth.signOut();
        window.location.replace('admin-login.html?error=unauthorized');
        return;
      }
      await loadConsents();
      initialized = true;
      render();
    } catch (error) {
      console.error('[Admin] Refresh failed:', error);
      if (error?.code === '42501') {
        showError('Tài khoản hiện tại không có quyền đọc dữ liệu. Kiểm tra bảng admins + RLS.');
      } else if (String(error?.message || '').includes('CONFIG_INVALID')) {
        showError('Chưa cấu hình js/config.js bằng Supabase URL + Publishable key.');
      } else {
        showError('Không thể tải danh sách. Kiểm tra kết nối, bảng consents và policy RLS rồi thử lại.');
      }
    } finally {
      refreshButton.disabled = false;
      refreshButton.classList.remove('spinning');
      root.setAttribute('aria-busy', 'false');
      render();
    }
  }

  function updateRealtimeStatus(text, mode) {
    realtimeState.textContent = text;
    realtimeState.dataset.state = mode || 'unknown';
  }

  async function subscribeRealtime() {
    if (!supabase) return;
    if (currentChannel) {
      await supabase.removeChannel(currentChannel).catch(() => {});
    }

    currentChannel = supabase
      .channel(`consents-admin-${crypto.randomUUID?.() || Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'consents'
      }, (payload) => {
        const incoming = payload?.new;
        if (!incoming?.id) return;
        if (consents.some((row) => row.id === incoming.id)) return;
        consents.unshift(incoming);
        render();
        showToast(`🎉 ${safeText(incoming.name)} vừa nói YES ❤️`, 'success');
        notifyBrowser(safeText(incoming.name));
      })
      .subscribe((status, error) => {
        logDev('Realtime status:', status, error || '');
        if (status === 'SUBSCRIBED') {
          updateRealtimeStatus('Đã kết nối', 'online');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          updateRealtimeStatus('Lỗi kết nối', 'error');
          showToast('Realtime đang gặp sự cố. Dashboard vẫn có thể làm mới thủ công.', 'error');
        } else {
          updateRealtimeStatus('Đang kết nối…', 'connecting');
        }
      });
  }

  function notifyBrowser(name) {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      const notification = new Notification('💖 Có người vừa đồng ý!', {
        body: `${name} vừa nói YES ❤️`,
        icon: 'assets/favicon.svg',
        tag: 'love-consent'
      });
      window.setTimeout(() => notification.close(), 7000);
    } catch (error) {
      logDev('Browser Notification unavailable:', error);
    }
  }

  notificationButton?.addEventListener('click', async () => {
    try {
      if (!('Notification' in window)) {
        showToast('Trình duyệt này không hỗ trợ Browser Notification.', 'error');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        showToast('Đã bật thông báo trên trình duyệt 🔔', 'success');
        notificationButton.textContent = '🔔 Đã bật thông báo';
      } else {
        showToast('Thông báo chưa được cấp quyền. Bạn có thể bật lại trong cài đặt trình duyệt.', 'error');
      }
    } catch (error) {
      console.error('[Admin] Notification permission failed:', error);
      showToast('Không thể bật thông báo trên trình duyệt này.', 'error');
    }
  });

  refreshButton?.addEventListener('click', refresh);
  retryButton?.addEventListener('click', refresh);
  searchInput?.addEventListener('input', render);

  sortButton?.addEventListener('click', () => {
    newestFirst = !newestFirst;
    sortButton.textContent = newestFirst ? 'Mới nhất ↓' : 'Cũ nhất ↑';
    sortButton.setAttribute('aria-pressed', String(newestFirst));
    render();
  });

  logoutButton?.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.replace('admin-login.html');
    }
  });

  supabase?.auth.onAuthStateChange(async (event, session) => {
    logDev('Auth event:', event);
    if (event === 'SIGNED_OUT') {
      window.location.replace('admin-login.html');
      return;
    }
    if (event === 'TOKEN_REFRESHED' && !session) {
      window.location.replace('admin-login.html');
    }
  });

  async function init() {
    if (!supabase) {
      showError('Supabase SDK chưa tải hoặc js/config.js chưa hợp lệ.');
      return;
    }

    const urlError = new URLSearchParams(window.location.search).get('error');
    if (urlError === 'unauthorized') {
      showToast('Tài khoản này không phải admin.', 'error');
    }

    try {
      const session = await getCurrentSession();
      if (!session) {
        window.location.replace('admin-login.html');
        return;
      }
      if (!(await assertAdmin(session))) {
        await supabase.auth.signOut();
        window.location.replace('admin-login.html?error=unauthorized');
        return;
      }
      await loadConsents();
      initialized = true;
      render();
      await subscribeRealtime();
      if ('Notification' in window && Notification.permission === 'granted') {
        notificationButton.textContent = '🔔 Đã bật thông báo';
      }
    } catch (error) {
      console.error('[Admin] Init failed:', error);
      if (error?.code === '42501') {
        showError('Tài khoản hiện tại không có quyền đọc dữ liệu. Kiểm tra bảng admins + RLS.');
      } else {
        showError('Không thể mở dashboard. Hãy kiểm tra cấu hình Supabase.');
      }
      root.setAttribute('aria-busy', 'false');
    }
  }

  init();
})();
