# 🎓 Đăng Ký Giảng Viên Hướng Dẫn Thực Tập — Dự án 20

Ứng dụng cho phép sinh viên đăng ký giảng viên hướng dẫn thực tập, chạy trên **Vercel** + **Supabase**.

---

## 🗂️ Cấu trúc file

```
Du an 20/
├── index.html         # Giao diện chính (Sinh viên + Admin)
├── style.css          # CSS toàn bộ ứng dụng
├── supabase-client.js # Supabase client + CRUD
├── app.js             # Logic ứng dụng
├── config.js          # Cấu hình Supabase + mật khẩu Admin
├── vercel.json        # Config deploy Vercel
└── README.md          # File này
```

---

## 🚀 Hướng dẫn cài đặt

### 1. Tạo Supabase Project

1. Truy cập [https://supabase.com](https://supabase.com) → **New project**
2. Vào **Project Settings → API** → copy **Project URL** và **anon public key**

---

### 2. Tạo bảng trong Supabase SQL Editor

Chạy lần lượt các lệnh SQL sau:

```sql
-- =============================================
-- BẢNG 1: nganh_hoc (Ngành học)
-- =============================================
CREATE TABLE nganh_hoc (
  id         BIGSERIAL PRIMARY KEY,
  ten_nganh  TEXT NOT NULL,
  mo_ta      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BẢNG 2: giang_vien (Giảng viên)
-- =============================================
CREATE TABLE giang_vien (
  id               BIGSERIAL PRIMARY KEY,
  ho_ten           TEXT NOT NULL,
  hoc_vi           TEXT DEFAULT '',
  email            TEXT DEFAULT '',
  so_luong_toi_da  INT DEFAULT 0,   -- 0 = không giới hạn
  nganh_id         BIGINT REFERENCES nganh_hoc(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gv_nganh ON giang_vien(nganh_id);

-- =============================================
-- BẢNG 3: dang_ky (Đăng ký của sinh viên)
-- =============================================
CREATE TABLE dang_ky (
  id               BIGSERIAL PRIMARY KEY,
  msv              TEXT NOT NULL UNIQUE,   -- Mã số SV, mỗi SV chỉ đăng ký 1 lần
  ho_ten           TEXT NOT NULL,
  lop              TEXT NOT NULL,
  nganh_id         BIGINT REFERENCES nganh_hoc(id)  ON DELETE SET NULL,
  giang_vien_id    BIGINT REFERENCES giang_vien(id)  ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dk_nganh    ON dang_ky(nganh_id);
CREATE INDEX idx_dk_giangvien ON dang_ky(giang_vien_id);
```

---

### 3. Bật Row Level Security (cho phép đọc/ghi không cần đăng nhập)

```sql
-- Bật RLS
ALTER TABLE nganh_hoc  ENABLE ROW LEVEL SECURITY;
ALTER TABLE giang_vien ENABLE ROW LEVEL SECURITY;
ALTER TABLE dang_ky    ENABLE ROW LEVEL SECURITY;

-- Policy cho phép tất cả (ứng dụng nội bộ)
CREATE POLICY "allow_all" ON nganh_hoc  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON giang_vien FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON dang_ky    FOR ALL USING (true) WITH CHECK (true);
```

---

### 4. Cấu hình file `config.js`

```js
const SUPABASE_CONFIG = {
  url: 'https://your-project.supabase.co',  // ← Thay URL thật
  key: 'eyJhbGciOiJIUzI1NiIs...',           // ← Thay anon key thật
};

const ADMIN_PASSWORD = 'admin@2024';  // ← Đổi mật khẩu admin
```

---

### 5. Deploy lên Vercel

1. Push thư mục `Du an 20` lên GitHub
2. Vào [vercel.com](https://vercel.com) → **New Project** → chọn repo → Deploy
3. Không cần build command (static site)

---

## 📖 Hướng dẫn sử dụng

### Thứ tự thiết lập ban đầu (Admin):

1. Truy cập app → nhấn **⚙️ Quản trị** → nhập mật khẩu
2. Tab **🎓 Ngành học** → thêm các ngành học (CNTT, Kế toán, Quản trị...)
3. Tab **👨‍🏫 Giảng viên** → thêm giảng viên và phân công vào ngành
   - Số SV tối đa: điền 0 = không giới hạn; điền số cụ thể sẽ hiển thị "Còn X chỗ"
4. Chia sẻ link cho sinh viên đăng ký

### Sinh viên đăng ký:

1. Mở trang web → điền thông tin (MSSV, họ tên, ngành, lớp)
2. Chọn ngành → danh sách GV của ngành đó tự động hiện ra
3. Chọn giảng viên → nhấn **Đăng Ký Ngay**
4. Mỗi MSSV chỉ đăng ký được **1 lần**

### Xuất danh sách (Admin):

- Tab **📊 DS Đăng ký** → lọc theo ngành (tùy chọn) → **📥 Xuất Excel**
- File Excel gồm: STT, MSSV, Họ tên, Ngành, Lớp, Giảng viên hướng dẫn

---

## 📋 Cột thông tin file Excel xuất ra

| STT | Mã số sinh viên | Họ tên sinh viên | Ngành học | Lớp | Giảng viên hướng dẫn |
|-----|-----------------|------------------|-----------|-----|----------------------|
| 1   | 21110001        | Nguyễn Văn A     | CNTT      | 21CNTT1 | TS. Trần Văn B |
