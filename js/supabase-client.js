(function () {
  'use strict';

  const config = window.APP_CONFIG || {};
  const validUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co(?:\/)?$/i.test(config.SUPABASE_URL || '');
  const validKey = typeof config.SUPABASE_PUBLISHABLE_KEY === 'string'
    && config.SUPABASE_PUBLISHABLE_KEY.length > 20
    && !config.SUPABASE_PUBLISHABLE_KEY.includes('REPLACE_ME');

  window.APP_CONFIG_STATUS = Object.freeze({ valid: validUrl && validKey, validUrl, validKey });

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('[Supabase] SDK chưa được tải.');
    return;
  }

  if (!validUrl || !validKey) {
    console.warn('[Supabase] Cấu hình chưa hoàn tất. Hãy sửa js/config.js.');
  }

  try {
    window.supabaseClient = window.supabase.createClient(
      config.SUPABASE_URL,
      config.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      }
    );
  } catch (error) {
    console.error('[Supabase] Không tạo được client.', error);
    window.supabaseClient = null;
  }
})();
