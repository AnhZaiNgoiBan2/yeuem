(function () {
  'use strict';

  const supabase = window.supabaseClient;
  const config = window.APP_CONFIG || {};
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const form = document.getElementById('loveForm');
  const nameInput = document.getElementById('name');
  const nameError = document.getElementById('nameError');
  const agreeButton = document.getElementById('agreeButton');
  const rejectButton = document.getElementById('rejectButton');
  const buttonStage = document.getElementById('buttonStage');
  const successView = document.getElementById('successView');
  const successName = document.getElementById('successName');
  const toast = document.getElementById('toast');
  const heartsContainer = document.getElementById('hearts');

  let isSubmitting = false;
  let toastTimer = 0;

  function logDev(...args) {
    if (config.DEV_MODE) console.info('[LoveConfession]', ...args);
  }

  function showToast(message, type = 'info') {
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function setFieldError(message) {
    nameError.textContent = message || '';
    nameInput.classList.toggle('invalid', Boolean(message));
    if (message) nameInput.setAttribute('aria-invalid', 'true');
    else nameInput.removeAttribute('aria-invalid');
  }

  function createHeart() {
    if (!heartsContainer || reduceMotion) return;
    const heart = document.createElement('span');
    heart.className = 'floating-heart';
    heart.textContent = Math.random() > 0.4 ? '♥' : '♡';
    heart.style.left = `${Math.random() * 100}%`;
    heart.style.fontSize = `${10 + Math.random() * 18}px`;
    heart.style.animationDuration = `${7 + Math.random() * 7}s`;
    heart.style.animationDelay = `${Math.random() * 2}s`;
    heartsContainer.appendChild(heart);
    window.setTimeout(() => heart.remove(), 15500);
  }

  function seedHearts() {
    if (reduceMotion) return;
    for (let i = 0; i < 18; i += 1) createHeart();
    window.setInterval(createHeart, 1500);
  }

  function makeConfetti() {
    if (reduceMotion) return;
    const colors = ['❤', '♥', '✦', '✧', '♡'];
    for (let i = 0; i < 46; i += 1) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.textContent = colors[i % colors.length];
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 260;
      piece.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
      piece.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
      piece.style.setProperty('--delay', `${Math.random() * 0.25}s`);
      piece.style.setProperty('--scale', `${0.7 + Math.random() * 0.8}`);
      piece.style.left = '50%';
      piece.style.top = '48%';
      document.body.appendChild(piece);
      window.setTimeout(() => piece.remove(), 1600);
    }
  }

  function playChime() {
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return;
      const ctx = new AudioContextCtor();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, now + index * 0.12);
        gain.gain.linearRampToValueAtTime(0.12, now + index * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.38);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(now + index * 0.12);
        oscillator.stop(now + index * 0.12 + 0.42);
      });
      window.setTimeout(() => ctx.close().catch(() => {}), 1400);
    } catch (error) {
      logDev('Audio không khả dụng:', error);
    }
  }

  function setSubmitting(loading) {
    isSubmitting = loading;
    agreeButton.disabled = loading;
    agreeButton.classList.toggle('loading', loading);
    rejectButton.disabled = loading;
    nameInput.disabled = loading;
  }

  function showSuccess(name) {
    successName.textContent = `${name} ❤️`;
    successView.setAttribute('aria-hidden', 'false');
    successView.classList.add('visible');
    document.body.classList.add('success-open');
    window.setTimeout(() => document.querySelector('#successView .success-card')?.focus?.(), 50);
    makeConfetti();
    playChime();
  }

  function rememberSuccess(name) {
    try {
      sessionStorage.setItem('love_confession_success', JSON.stringify({ name, at: Date.now() }));
    } catch (error) {
      logDev('Không lưu UX session:', error);
    }
  }

  function restoreSuccess() {
    try {
      const raw = sessionStorage.getItem('love_confession_success');
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (!saved?.name) return false;
      if (Date.now() - Number(saved.at) > 24 * 60 * 60 * 1000) {
        sessionStorage.removeItem('love_confession_success');
        return false;
      }
      nameInput.value = saved.name;
      showSuccess(saved.name);
      return true;
    } catch (error) {
      logDev('Không khôi phục trạng thái UX:', error);
      return false;
    }
  }

  function validateName() {
    const name = nameInput.value.trim();
    if (!name) {
      setFieldError('Em chưa nhập tên kìa 🥺');
      return null;
    }
    if (name.length < 2) {
      setFieldError('Tên có vẻ ngắn quá rồi đó ❤️');
      return null;
    }
    if (name.length > 80) {
      setFieldError('Tên tối đa 80 ký tự nhé.');
      return null;
    }
    setFieldError('');
    return name;
  }

  async function saveConsent(name) {
    if (!supabase) throw new Error('SUPABASE_CLIENT_MISSING');
    if (!window.APP_CONFIG_STATUS?.valid) throw new Error('SUPABASE_CONFIG_INVALID');

    const payload = {
      name,
      user_agent: navigator.userAgent ? navigator.userAgent.slice(0, 512) : null
    };

    const { error } = await supabase.from('consents').insert(payload);
    if (error) {
      logDev('Supabase INSERT error:', error);
      throw error;
    }
  }

  function moveRejectButton() {
    if (isSubmitting || !buttonStage || !rejectButton) return;

    const stageRect = buttonStage.getBoundingClientRect();
    const agreeRect = agreeButton.getBoundingClientRect();
    const rejectRect = rejectButton.getBoundingClientRect();

    const padding = 4;
    const maxX = Math.max(padding, stageRect.width - rejectRect.width - padding);
    const maxY = Math.max(padding, stageRect.height - rejectRect.height - padding);

    let chosen = null;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const x = padding + Math.random() * Math.max(1, maxX - padding);
      const y = padding + Math.random() * Math.max(1, maxY - padding);
      const candidate = {
        left: stageRect.left + x,
        top: stageRect.top + y,
        right: stageRect.left + x + rejectRect.width,
        bottom: stageRect.top + y + rejectRect.height
      };

      const gap = 14;
      const overlapsAgree = !(
        candidate.right + gap < agreeRect.left ||
        candidate.left - gap > agreeRect.right ||
        candidate.bottom + gap < agreeRect.top ||
        candidate.top - gap > agreeRect.bottom
      );

      if (!overlapsAgree) {
        chosen = { x, y };
        break;
      }
    }

    if (!chosen) {
      chosen = { x: padding, y: maxY };
    }

    rejectButton.classList.add('dodging');
    rejectButton.style.left = `${chosen.x}px`;
    rejectButton.style.top = `${chosen.y}px`;
    window.setTimeout(() => rejectButton.classList.remove('dodging'), 260);
  }

  rejectButton?.addEventListener('pointerenter', moveRejectButton, { passive: true });
  rejectButton?.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    moveRejectButton();
  }, { passive: false });
  rejectButton?.addEventListener('click', (event) => {
    event.preventDefault();
    moveRejectButton();
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const name = validateName();
    if (!name) {
      nameInput.focus();
      return;
    }

    if (!navigator.onLine) {
      showToast('Mạng đang mất kết nối. Em thử lại nhé 💗', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await saveConsent(name);
      rememberSuccess(name);
      showSuccess(name);
    } catch (error) {
      console.error('[LoveConfession] Submit failed:', error);
      if (error?.code === '42501') {
        showToast('Website chưa được cấp quyền gửi câu trả lời. Hãy kiểm tra RLS.', 'error');
      } else if (error?.message?.toLowerCase?.().includes('failed to fetch')) {
        showToast('Không kết nối được Supabase. Em kiểm tra mạng rồi thử lại nhé.', 'error');
      } else if (error?.message?.includes?.('SUPABASE_')) {
        showToast('Chủ website chưa cấu hình Supabase xong. ❤️', 'error');
      } else {
        showToast('Có chút trục trặc khi gửi câu trả lời. Em thử lại nhé.', 'error');
      }
      setSubmitting(false);
    }
  });

  nameInput?.addEventListener('input', () => {
    if (nameInput.value.trim()) setFieldError('');
  });

  window.addEventListener('resize', () => {
    if (rejectButton) {
      rejectButton.style.left = '';
      rejectButton.style.top = '';
    }
  });

  if (!restoreSuccess()) seedHearts();
  if (!reduceMotion) window.setTimeout(() => createHeart(), 700);
})();
