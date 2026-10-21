/**
 * supabase-client.js — Quản lý kết nối & CRUD Supabase
 *
 * Schema:
 *   nganh_hoc  : id, ten_nganh, mo_ta, created_at
 *   giang_vien : id, ho_ten, hoc_vi, email, so_luong_toi_da, nganh_ids (int4[]), created_at
 *   dang_ky    : id, msv, ho_ten, lop, nganh_id (FK), giang_vien_id (FK), created_at
 *
 * Lưu ý: nganh_ids là mảng integer (PostgreSQL int4[]) cho phép GV thuộc nhiều ngành.
 * SQL thêm cột: ALTER TABLE giang_vien ADD COLUMN IF NOT EXISTS nganh_ids int4[] DEFAULT '{}';
 */

const DB = (() => {
  let _client = null;

  // ── Khởi tạo ────────────────────────────────────────────────────────────
  function init(url, key) {
    _client = window.supabase.createClient(url, key);
    return _client;
  }
  function getClient() { return _client; }
  function isReady()   { return !!_client; }

  // ── Load config ──────────────────────────────────────────────────────────
  function loadConfig() {
    if (
      typeof SUPABASE_CONFIG !== 'undefined' &&
      SUPABASE_CONFIG.url && !SUPABASE_CONFIG.url.includes('your-project-id') &&
      SUPABASE_CONFIG.key && !SUPABASE_CONFIG.key.includes('your-anon-public-key')
    ) {
      return { url: SUPABASE_CONFIG.url, key: SUPABASE_CONFIG.key };
    }
    return { url: '', key: '' };
  }

  // ── Generic ──────────────────────────────────────────────────────────────
  async function fetchAll(table, opts = {}) {
    let q = _client.from(table).select(opts.select || '*');
    if (opts.order)  q = q.order(opts.order, { ascending: opts.asc ?? true });
    if (opts.eq)     Object.entries(opts.eq).forEach(([k,v]) => { q = q.eq(k, v); });
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function insertOne(table, payload) {
    const { data, error } = await _client.from(table).insert(payload).select().single();
    if (error) throw error;
    return data;
  }

  async function updateOne(table, id, payload) {
    const { data, error } = await _client.from(table).update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async function deleteOne(table, id) {
    const { error } = await _client.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  // ── NGÀNH HỌC ────────────────────────────────────────────────────────────
  async function getNganh() {
    return fetchAll('nganh_hoc', { order: 'ten_nganh', asc: true });
  }
  async function addNganh(ten_nganh, mo_ta = '') {
    return insertOne('nganh_hoc', { ten_nganh, mo_ta });
  }
  async function updateNganh(id, payload) {
    return updateOne('nganh_hoc', id, payload);
  }
  async function deleteNganh(id) {
    return deleteOne('nganh_hoc', id);
  }

  // ── GIẢNG VIÊN ───────────────────────────────────────────────────────────
  async function getGiangVien() {
    // Lấy tất cả GV, không filter ngành — app.js tự filter theo nganh_ids
    return fetchAll('giang_vien', { order: 'ho_ten', asc: true });
  }
  async function addGiangVien(payload) {
    return insertOne('giang_vien', payload);
  }
  async function updateGiangVien(id, payload) {
    return updateOne('giang_vien', id, payload);
  }
  async function deleteGiangVien(id) {
    return deleteOne('giang_vien', id);
  }

  // Đếm số SV đã đăng ký theo từng GV
  async function countSvByGv() {
    const { data, error } = await _client
      .from('dang_ky')
      .select('giang_vien_id');
    if (error) throw error;
    const map = {};
    (data || []).forEach(r => {
      map[r.giang_vien_id] = (map[r.giang_vien_id] || 0) + 1;
    });
    return map;
  }

  // ── ĐĂNG KÝ ──────────────────────────────────────────────────────────────
  async function getDangKy(nganh_id = null) {
    let q = _client
      .from('dang_ky')
      .select(`
        id, msv, ho_ten, lop, created_at,
        nganh_hoc   ( ten_nganh ),
        giang_vien  ( ho_ten, hoc_vi )
      `)
      .order('created_at', { ascending: true });
    if (nganh_id) q = q.eq('nganh_id', nganh_id);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  // Kiểm tra MSSV đã đăng ký chưa
  async function checkMsvExists(msv) {
    const { data, error } = await _client
      .from('dang_ky')
      .select('id')
      .eq('msv', msv.trim())
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }

  async function addDangKy(payload) {
    return insertOne('dang_ky', payload);
  }

  async function deleteDangKy(id) {
    return deleteOne('dang_ky', id);
  }

  async function deleteAllDangKy(nganh_id = null) {
    let q = _client.from('dang_ky').delete();
    if (nganh_id) {
      q = q.eq('nganh_id', nganh_id);
    } else {
      // Xóa toàn bộ — Supabase yêu cầu điều kiện, dùng neq với giá trị không tồn tại
      q = q.gte('id', 0);
    }
    const { error } = await q;
    if (error) throw error;
  }

  return {
    init, getClient, isReady, loadConfig,
    getNganh, addNganh, updateNganh, deleteNganh,
    getGiangVien, addGiangVien, updateGiangVien, deleteGiangVien, countSvByGv,
    getDangKy, addDangKy, deleteDangKy, deleteAllDangKy, checkMsvExists,
  };
})();
