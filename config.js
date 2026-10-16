/**
 * config.js — Cấu hình kết nối Supabase
 * Lấy thông tin tại: Supabase Dashboard → Project Settings → API
 */
const SUPABASE_CONFIG = {
  url: 'https://iexotwlyluvihnqqkzft.supabase.co',  // ← Thay bằng Project URL
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlleG90d2x5bHV2aWhucXFremZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMzY4NzAsImV4cCI6MjEwNzYxMjg3MH0.F-2-XLspGqJ89O3INEf40cLI02CI8CMp6Y39vrO-aVM',                  // ← Thay bằng anon public key
};

/**
 * Mật khẩu Admin để vào trang quản trị
 * Thay bằng mật khẩu thực tế của bạn
 */
const ADMIN_PASSWORD = 'admin@2024';
