# 💌 Love Confession — GitHub Pages + Supabase

Website tỏ tình static, responsive, không cần server Node/Python/PHP. Frontend chạy trên GitHub Pages và dùng Supabase cho:

- PostgreSQL Database
- Supabase Auth
- Row Level Security (RLS)
- Realtime Postgres Changes

> **Quan trọng:** Frontend chỉ chứa Supabase Project URL + Publishable key/legacy anon key. Không bao giờ đưa `service_role`/secret key vào repository.

---

## A. Cây thư mục

```text
love-confession/
├── index.html
├── admin-login.html
├── admin.html
├── README.md
├── .gitignore
├── .nojekyll
│
├── css/
│   ├── style.css
│   ├── admin-login.css
│   └── admin.css
│
├── js/
│   ├── config.js
│   ├── supabase-client.js
│   ├── main.js
│   ├── admin-login.js
│   └── admin.js
│
├── assets/
│   ├── heart.svg
│   ├── favicon.svg
│   └── images/
│
├── supabase/
│   ├── schema.sql
│   ├── policies.sql
│   └── seed.sql
│
└── .github/
    └── workflows/
        └── deploy.yml
```

---

# B. Tính năng

## Trang công khai `index.html`

- Input tên người được gửi link.
- Nút `ĐỒNG Ý ❤️` nổi bật.
- Nút `TỪ CHỐI 😭` chạy tránh pointer/touch/click.
- Nút từ chối luôn bị giới hạn trong khu vực lựa chọn và không đè lên nút đồng ý.
- Background glassmorphism + gradient + bokeh + heart particles.
- Animation và responsive desktop/mobile.
- `prefers-reduced-motion` được tôn trọng.
- Submit vào Supabase.
- Disable nút để tránh double click.
- SessionStorage chỉ dùng để cải thiện UX sau khi đã thành công; Database vẫn là nguồn dữ liệu chính.
- Màn hình `EM ĐỒNG Ý RỒI! ❤️🥰` + confetti + chime nhẹ.

## Admin

- `admin-login.html`: email/password qua Supabase Auth.
- `admin.html`: dashboard chỉ dành cho user có row trong `public.admins`.
- Tổng số người đồng ý.
- Số người đồng ý hôm nay.
- Bảng tên/trạng thái/thời gian.
- Tìm theo tên.
- Sort mới nhất/cũ nhất.
- Refresh.
- Logout.
- Browser Notification.
- Supabase Realtime: admin đang mở dashboard sẽ nhận INSERT gần như ngay lập tức.

---

# C. Bước 1 — Tạo Supabase Project

1. Vào Supabase Dashboard: tạo một project mới.
2. Đợi project hoàn tất.
3. Vào **Settings → API Keys** hoặc khu vực **Connect** của project.
4. Lấy:
   - **Project URL**
   - **Publishable key** (`sb_publishable_...`)

Project cũ có thể vẫn hiển thị legacy `anon` key. Key legacy vẫn dùng được, nhưng với project mới nên ưu tiên Publishable key.

> Không lấy `secret` key hoặc `service_role` key cho frontend.

---

# D. Bước 2 — Tạo database

Trong **SQL Editor** của Supabase, chạy lần lượt:

### 1. `supabase/schema.sql`

Copy toàn bộ file và Run.

File này tạo:

- extension `pgcrypto`
- `public.consents`
- `public.admins`
- indexes
- trigger ép `status = 'agreed'` và `created_at = now()`
- thêm `consents` vào publication `supabase_realtime` nếu publication đã tồn tại

### 2. `supabase/policies.sql`

Copy toàn bộ file và Run.

File này:

- bật RLS cho cả hai bảng
- revoke grants mặc định
- chỉ cấp INSERT cho consent
- chỉ cấp SELECT consents cho authenticated
- nhưng RLS SELECT chỉ mở cho user có `user_id` trong `admins`
- không cấp UPDATE/DELETE
- admins chỉ đọc được row của chính mình

### 3. `supabase/seed.sql`

File này là template để thêm tài khoản admin sau khi đã tạo user Auth.

---

# E. Bước 3 — Tạo tài khoản admin

Vào Supabase Dashboard → **Authentication → Users** và tạo user bằng email + password.

Tùy cấu hình Auth, bạn có thể phải xác nhận email trước khi đăng nhập.

Sau khi user được tạo, vào SQL Editor:

```sql
select id, email, created_at
from auth.users
order by created_at desc;
```

Copy UUID của **chính tài khoản admin của bạn**.

Sau đó chạy:

```sql
insert into public.admins (user_id)
values ('UUID_CUA_BAN');
```

Kiểm tra:

```sql
select id, user_id, created_at
from public.admins;
```

### Xóa quyền admin

```sql
delete from public.admins
where user_id = 'UUID_CUA_BAN';
```

Không có mật khẩu admin hard-code trong JavaScript.

---

# F. Bước 4 — Cấu hình frontend

Mở:

```text
js/config.js
```

Thay:

```js
window.APP_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_REPLACE_ME',
  DEV_MODE: true
});
```

bằng thông tin project của bạn, ví dụ:

```js
window.APP_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://abcdefghijk.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_xxxxxxxxxxxxx',
  DEV_MODE: true
});
```

### Lưu ý

`SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` xuất hiện trong frontend là bình thường.

**Không bao giờ** thay nó bằng:

```text
sb_secret_...
```

hoặc:

```text
service_role
```

---

# G. Bước 5 — Cấu hình Auth URL

Sau khi biết URL GitHub Pages của bạn, vào Supabase:

**Authentication → URL Configuration**

Đặt:

- **Site URL** = URL GitHub Pages của website.
- **Redirect URLs** = thêm URL website và các URL cần thiết nếu project yêu cầu.

Ví dụ nếu GitHub username là `abc` và repository là `love-confession`:

```text
https://abc.github.io/love-confession/
```

Admin login:

```text
https://abc.github.io/love-confession/admin-login.html
```

> Tên GitHub username/repository của bạn chỉ là ví dụ; hãy thay bằng URL thật.

---

# H. Bước 6 — Chạy thử local

Không bắt buộc cài Node.

Nếu có Python, có thể chạy:

```bash
cd love-confession
python -m http.server 5500
```

Mở:

```text
http://localhost:5500
```

Trang admin login:

```text
http://localhost:5500/admin-login.html
```

### Không nên mở bằng `file:///.../index.html`

Nên dùng localhost server để trình duyệt xử lý các request/network như môi trường web thật.

---

# I. Bước 7 — Test chức năng trước khi public

## Test public

1. Mở index.
2. Không nhập tên → phải báo lỗi.
3. Nhập tên → nút đồng ý hoạt động.
4. Hover/chạm/click nút từ chối → nó di chuyển.
5. Nó không được ra ngoài viewport/card.
6. Nó không che nút đồng ý.
7. Bấm đồng ý → Supabase có thêm một dòng.
8. Nút được disable trong lúc submit.
9. Mở lại tab/refresh → không tự tạo thêm hàng loạt row; trạng thái success chỉ được khôi phục bằng session UX.

## Test anon không đọc được consent

Không đăng nhập admin, cố ý chạy query đọc `consents` bằng frontend/browser DevTools.

Kỳ vọng: không lấy được danh sách.

## Test admin

1. Đăng nhập đúng email/password.
2. User phải tồn tại trong `public.admins`.
3. Admin vào được `admin.html`.
4. Danh sách hiển thị.
5. Mở dashboard trước.
6. Mở một tab public khác và bấm `ĐỒNG Ý`.
7. Dashboard admin phải nhận row mới qua Realtime mà không cần refresh.
8. Nếu đã cấp notification: trình duyệt hiện `💖 Có người vừa đồng ý!`.

## Test non-admin

1. Tạo một user Auth khác.
2. Không thêm user này vào `public.admins`.
3. Đăng nhập admin.
4. Dashboard phải từ chối truy cập và sign out.
5. Nếu cố query `consents`, RLS không trả về danh sách.

---

# J. Bước 8 — Tạo GitHub repository

Tạo repository mới, ví dụ:

```text
love-confession
```

Trong terminal:

```bash
cd love-confession

git init
git add .
git commit -m "Initial love confession website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/love-confession.git
git push -u origin main
```

Thay `YOUR_USERNAME` bằng GitHub username của bạn.

---

# K. Bước 9 — Bật GitHub Pages

Repository → **Settings → Pages**.

Ở **Build and deployment**:

- Source: **GitHub Actions**

Workflow đã có sẵn ở:

```text
.github/workflows/deploy.yml
```

Mỗi lần push lên `main`, GitHub Actions sẽ upload static site và deploy lên GitHub Pages.

---

# L. Bước 10 — Lấy URL website

Sau khi workflow chạy thành công:

Repository → **Settings → Pages**.

GitHub sẽ hiển thị URL site.

Thông thường có dạng:

```text
https://YOUR_USERNAME.github.io/love-confession/
```

Mở URL và kiểm tra index.

Admin:

```text
https://YOUR_USERNAME.github.io/love-confession/admin-login.html
```

---

# M. Security checklist

### Frontend có chứa secret key không?

Tìm trong toàn project các chuỗi:

```text
service_role
sb_secret_
```

Không được có chúng trong HTML/CSS/JS.

### Public có đọc được consents không?

Không.

`anon` chỉ có INSERT. Không có SELECT grant.

### Authenticated non-admin có đọc được consents không?

Không.

SELECT RLS yêu cầu user có row trong `admins`.

### Authenticated non-admin có xem admins không?

Không xem được row của người khác. Policy của `admins` chỉ cho chính user đọc row của mình.

### Có hard-code password admin không?

Không. Supabase Auth xử lý email/password.

### Có localStorage làm database không?

Không. Database là Supabase. SessionStorage chỉ lưu trạng thái UX tạm thời sau khi submit thành công để tránh refresh tạo consent mới.

---

# N. Chống spam / giới hạn gửi

Website này xử lý **double-click/double-submit ở client** và bảo vệ quyền dữ liệu bằng RLS.

Tuy nhiên, vì endpoint INSERT được public cho đúng yêu cầu “ai có link cũng có thể trả lời”, một người có kiến thức kỹ thuật vẫn có thể gọi Data API trực tiếp và gửi nhiều row.

Nếu sau này bạn cần chống spam mạnh hơn, nên thêm một lớp server-side/Edge Function có rate limit hoặc CAPTCHA. Không cần thiết cho phiên bản GitHub Pages cơ bản này.

---

# O. Realtime troubleshooting

Nếu admin dashboard không nhận dữ liệu mới:

1. Kiểm tra `consents` có nằm trong publication:

```sql
select *
from pg_publication_tables
where pubname = 'supabase_realtime';
```

2. Kết quả phải có:

```text
public | consents
```

3. Kiểm tra RLS của `consents`.
4. Đảm bảo admin user đang đăng nhập thật sự có row trong `public.admins`.
5. Mở DevTools → Console để xem trạng thái Realtime.

---

# P. Lỗi thường gặp

### `SUPABASE_CONFIG_INVALID`

Bạn chưa sửa `js/config.js`.

### `42501`

Thường là vấn đề grants hoặc RLS.

Kiểm tra `supabase/policies.sql`.

### Đăng nhập được nhưng dashboard bị chặn

Kiểm tra UUID Auth user có đúng với:

```sql
select * from public.admins;
```

### Submit lỗi

Kiểm tra:

- Project URL
- Publishable key
- bảng `consents`
- INSERT policy
- column grants

### Realtime không chạy

Kiểm tra publication `supabase_realtime` và RLS.

---

# Q. Những chỗ bạn bắt buộc phải thay

## 1. Supabase URL

File:

```text
js/config.js
```

Thay:

```js
SUPABASE_URL
```

## 2. Supabase Publishable key

File:

```text
js/config.js
```

Thay:

```js
SUPABASE_PUBLISHABLE_KEY
```

## 3. Admin account

Tạo tài khoản bằng Supabase Auth, lấy UUID rồi thêm vào:

```sql
public.admins
```

## 4. GitHub username/repository

Khi chạy git commands và khi cấu hình URL Supabase Auth, thay bằng thông tin thật của bạn.

---

# R. Ghi chú về bảo mật

Publishable/anon key **không phải mật khẩu**. Nó có thể xuất hiện trong code phía trình duyệt. Điều bảo vệ dữ liệu là PostgreSQL grants + RLS và Supabase Auth.

Secret key/service_role key có quyền cao và phải ở phía server/secure environment; project này cố ý không có backend server để GitHub Pages có thể host static files trực tiếp.

---

# S. Deploy flow cuối cùng

```text
Người dùng
   │
   ▼
GitHub Pages (HTML/CSS/JS)
   │
   ├── Supabase Auth  ──► Admin login
   │
   └── Supabase Data API
             │
             ▼
       PostgreSQL + RLS
             │
             └── Realtime INSERT
                    │
                    ▼
              Admin dashboard
```

---

## Hoàn tất

Sau khi thay 2 giá trị trong `js/config.js`, chạy SQL, tạo admin và push repository, website có thể chạy trực tiếp trên GitHub Pages.
# yeuem
