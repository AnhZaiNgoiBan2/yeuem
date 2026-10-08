// TODO: thay bằng thông tin Supabase của bạn.
// CHỈ dùng Publishable key (hoặc legacy anon key nếu project của bạn chưa có publishable key).
// TUYỆT ĐỐI KHÔNG đưa secret/service_role key vào frontend.
window.APP_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_REPLACE_ME',
  DEV_MODE: true
});
