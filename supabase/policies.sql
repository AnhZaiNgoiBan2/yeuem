-- Love Confession - policies.sql
-- Chạy sau schema.sql.
-- Quan trọng: GRANT + RLS cùng thực thi. RLS không tự thu hồi table grants.

alter table public.consents enable row level security;
alter table public.admins enable row level security;

-- Nguyên tắc đặc quyền tối thiểu.
revoke all on table public.consents from anon, authenticated;
revoke all on table public.admins from anon, authenticated;

-- Public/visitor chỉ được tạo consent.
-- Cấp column-level INSERT để không cho client ghi id/status/created_at.
grant insert (name, user_agent) on table public.consents to anon, authenticated;

-- Chỉ authenticated mới có SELECT consents, nhưng RLS tiếp tục giới hạn đúng admin.
grant select (id, name, status, created_at, user_agent) on table public.consents to authenticated;

grant select (user_id) on table public.admins to authenticated;

-- Xóa policy cũ để script có thể chạy lại.
drop policy if exists "consents_public_insert" on public.consents;
drop policy if exists "consents_admin_select" on public.consents;
drop policy if exists "consents_no_update" on public.consents;
drop policy if exists "consents_no_delete" on public.consents;
drop policy if exists "admins_self_select" on public.admins;

-- INSERT: khách chưa đăng nhập hoặc authenticated user đều có thể gửi câu trả lời.
-- Tên phải hợp lệ; trigger normalize_consent sẽ btrim + giới hạn độ dài.
create policy "consents_public_insert"
on public.consents
for insert
to anon, authenticated
with check (
  char_length(btrim(name)) between 2 and 80
  and (user_agent is null or char_length(user_agent) <= 512)
);

-- SELECT: CHỈ authenticated user có user_id nằm trong public.admins của chính mình.
-- RLS trên admins chỉ cho phép đọc dòng của chính caller.
create policy "consents_admin_select"
on public.consents
for select
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where a.user_id = (select auth.uid())
  )
);

-- Không tạo UPDATE/DELETE policy -> mặc định bị từ chối.
-- Đặc biệt không cấp UPDATE/DELETE grants cho anon/authenticated.

create policy "admins_self_select"
on public.admins
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Kiểm tra nhanh quyền sau khi chạy script:
-- 1) Chưa đăng nhập: SELECT consents phải trả về 0 rows / permission denied tùy grant.
-- 2) Admin hợp lệ: SELECT consents đọc được toàn bộ.
-- 3) Authenticated non-admin: SELECT consents trả về 0 rows.
-- 4) Không có client nào được UPDATE/DELETE.
