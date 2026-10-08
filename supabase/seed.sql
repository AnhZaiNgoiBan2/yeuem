-- Love Confession - seed.sql
-- Tài khoản admin được tạo qua Supabase Auth trước.
-- Sau đó lấy UUID của tài khoản và chạy INSERT bên dưới.

-- Xem user IDs (chỉ trong Supabase SQL Editor / dashboard):
-- select id, email, created_at from auth.users order by created_at desc;

-- THAY UUID_BEN_DUOI bằng id thật của tài khoản admin của bạn rồi bỏ comment:
-- insert into public.admins (user_id)
-- values ('UUID_BEN_DUOI');

-- Kiểm tra:
-- select id, user_id, created_at from public.admins;
