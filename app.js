/**
 * app.js — Đăng Ký Giảng Viên Hướng Dẫn Thực Tập
 * Vanilla JS + Supabase + SheetJS (xuất Excel)
 */

const App = (() => {

  // ── State ────────────────────────────────────────────────────────────────
  let state = {
    nganhList:   [],   // [{ id, ten_nganh, mo_ta }]
    gvList:      [],   // [{ id, ho_ten, hoc_vi, email, so_luong_toi_da, nganh_id, nganh_hoc }]
    dangKyList:  [],   // join đầy đủ
    svCountByGv: {},   // { gv_id: count }
    isAdmin:     false,
    currentTab:  'nganh',
  };

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    const cfg = DB.loadConfig();
    if (!cfg.url || !cfg.key) {
      showToast('Chưa cấu hình Supabase. Kiểm tra file config.js!', 'error');
      return;
    }
    DB.init(cfg.url, cfg.key);
    loadPublicData();
  }

  async function loadPublicData() {
    try {
      state.nganhList = await DB.getNganh();
      renderNganhSelect('f-nganh');
    } catch (err) {
      showToast('Lỗi kết nối Supabase: ' + err.message, 'error');
    }
  }

  async function loadAdminData() {
    try {
      const [nganh, gv, dk, svCount] = await Promise.all([
        DB.getNganh(),
        DB.getGiangVien(),
        DB.getDangKy(),
        DB.countSvByGv(),
      ]);
      state.nganhList   = nganh;
      state.gvList      = gv;
      state.dangKyList  = dk;
      state.svCountByGv = svCount;
      renderNganhSelect('f-nganh');
      renderAdminNganhList();
      renderGvList();
      renderDanhSach();
      populateFilterSelects();
    } catch (err) {
      showToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    }
  }

  // ── Views ─────────────────────────────────────────────────────────────────
  function showView(name) {
    document.querySelectorAll('.view').forEach(el => {
      el.classList.remove('active');
      el.classList.add('hidden');
    });
    const el = document.getElementById('view-' + name);
    if (el) { el.classList.remove('hidden'); el.classList.add('active'); }

    // Cập nhật text nút toggle
    const btn = document.getElementById('btn-admin-toggle');
    if (name === 'register') btn.textContent = '⚙️ Quản trị';
    else if (name === 'admin') btn.textContent = '🎓 Trang sinh viên';
  }

  function toggleAdminLogin() {
    const currentView = document.querySelector('.view.active')?.id;
    if (currentView === 'view-admin') {
      showView('register');
    } else if (state.isAdmin) {
      showView('admin');
    } else {
      showView('admin-login');
      setTimeout(() => document.getElementById('admin-pwd')?.focus(), 100);
    }
  }

  function doAdminLogin() {
    const pwd = document.getElementById('admin-pwd')?.value || '';
    const correct = typeof ADMIN_PASSWORD !== 'undefined'
      ? ADMIN_PASSWORD
      : 'admin@2024';
    if (pwd === correct) {
      state.isAdmin = true;
      document.getElementById('admin-pwd').value = '';
      showView('admin');
      loadAdminData();
      showToast('Đăng nhập thành công!', 'success');
    } else {
      showToast('Mật khẩu không đúng!', 'error');
      document.getElementById('admin-pwd')?.select();
    }
  }

  function logout() {
    state.isAdmin = false;
    showView('register');
    showToast('Đã đăng xuất.');
  }

  // ── Admin tabs ────────────────────────────────────────────────────────────
  function switchAdminTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll('.admin-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    document.querySelectorAll('.admin-tab-content').forEach(el => {
      el.classList.remove('active');
      el.classList.add('hidden');
    });
    const content = document.getElementById('tab-' + tab);
    if (content) { content.classList.remove('hidden'); content.classList.add('active'); }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${type}`;
    clearTimeout(t._t);
    t._t = setTimeout(() => { t.className = 'toast hidden'; }, 3500);
  }

  function openModal(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-backdrop').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modal-backdrop').classList.add('hidden');
  }

  function closeSuccess() {
    document.getElementById('success-overlay').classList.add('hidden');
    // Reset form
    ['f-msv','f-hoten','f-lop'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const nganhEl = document.getElementById('f-nganh');
    if (nganhEl) nganhEl.value = '';
    document.getElementById('gv-loading').classList.remove('hidden');
    const gvSel = document.getElementById('f-gv');
    gvSel.classList.add('hidden');
    gvSel.innerHTML = '<option value="">-- Chọn giảng viên --</option>';
    document.getElementById('gv-info').classList.add('hidden');
  }

  // ── Populate selects ──────────────────────────────────────────────────────
  function renderNganhSelect(selectId) {
    const el = document.getElementById(selectId);
    if (!el) return;
    const cur = el.value;
    el.innerHTML = '<option value="">-- Chọn ngành học --</option>' +
      state.nganhList.map(n =>
        `<option value="${n.id}" ${n.id == cur ? 'selected' : ''}>${escHtml(n.ten_nganh)}</option>`
      ).join('');
  }

  function populateFilterSelects() {
    ['filter-nganh-gv', 'filter-nganh-ds'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const cur = el.value;
      el.innerHTML = '<option value="">Tất cả ngành</option>' +
        state.nganhList.map(n =>
          `<option value="${n.id}" ${n.id == cur ? 'selected' : ''}>${escHtml(n.ten_nganh)}</option>`
        ).join('');
    });
  }

  // ── ĐĂNG KÝ (Sinh viên) ──────────────────────────────────────────────────
  async function onNganhChange() {
    const nganhId = parseInt(document.getElementById('f-nganh').value);
    const gvSel   = document.getElementById('f-gv');
    const gvLoad  = document.getElementById('gv-loading');
    const gvInfo  = document.getElementById('gv-info');

    gvInfo.classList.add('hidden');
    gvSel.classList.add('hidden');
    gvSel.innerHTML = '<option value="">-- Chọn giảng viên --</option>';

    if (!nganhId) {
      gvLoad.innerHTML = '<span class="gv-hint">← Vui lòng chọn ngành học trước</span>';
      gvLoad.classList.remove('hidden');
      return;
    }

    gvLoad.innerHTML = '<div style="display:flex;align-items:center;gap:0.5rem;"><div class="spinner"></div> Đang tải giảng viên...</div>';
    gvLoad.classList.remove('hidden');

    try {
      // Lấy GV theo ngành + đếm SV đã đăng ký
      const [gvs, svCount] = await Promise.all([
        DB.getGiangVien(nganhId),
        DB.countSvByGv(),
      ]);
      state.svCountByGv = svCount;

      gvLoad.classList.add('hidden');

      if (gvs.length === 0) {
        gvLoad.innerHTML = '<span class="gv-hint" style="color:var(--danger)">Ngành này chưa có giảng viên hướng dẫn.</span>';
        gvLoad.classList.remove('hidden');
        return;
      }

      gvSel.innerHTML = '<option value="">-- Chọn giảng viên hướng dẫn --</option>' +
        gvs.map(gv => {
          const soLuongToiDa = gv.so_luong_toi_da || 0;
          const daDangKy     = svCount[gv.id] || 0;
          const conLai       = soLuongToiDa > 0 ? soLuongToiDa - daDangKy : null;
          const hetCho       = conLai !== null && conLai <= 0;
          const label = hetCho
            ? `${gv.ho_ten}${gv.hoc_vi ? ' (' + gv.hoc_vi + ')' : ''} — HẾT CHỖ`
            : `${gv.ho_ten}${gv.hoc_vi ? ' (' + gv.hoc_vi + ')' : ''}${conLai !== null ? ` — Còn ${conLai} chỗ` : ''}`;
          return `<option value="${gv.id}" ${hetCho ? 'disabled' : ''} data-soluong="${soLuongToiDa}" data-dadangky="${daDangKy}">${escHtml(label)}</option>`;
        }).join('');
      gvSel.classList.remove('hidden');
    } catch (err) {
      gvLoad.innerHTML = `<span style="color:var(--danger)">Lỗi: ${escHtml(err.message)}</span>`;
      gvLoad.classList.remove('hidden');
    }
  }

  function onGvChange() {
    const gvSel = document.getElementById('f-gv');
    const gvInfo = document.getElementById('gv-info');
    const opt = gvSel.options[gvSel.selectedIndex];
    if (!gvSel.value || !opt) { gvInfo.classList.add('hidden'); return; }
    const soLuong = parseInt(opt.dataset.soluong) || 0;
    const daDangKy = parseInt(opt.dataset.dadangky) || 0;
    if (soLuong > 0) {
      gvInfo.textContent = `📊 Giảng viên này hướng dẫn tối đa ${soLuong} sinh viên — Đã có ${daDangKy} SV đăng ký — Còn ${soLuong - daDangKy} chỗ trống.`;
      gvInfo.classList.remove('hidden');
    } else {
      gvInfo.classList.add('hidden');
    }
  }

  async function submitRegister() {
    const msv    = document.getElementById('f-msv').value.trim();
    const hoTen  = document.getElementById('f-hoten').value.trim();
    const nganhId = parseInt(document.getElementById('f-nganh').value);
    const lop    = document.getElementById('f-lop').value.trim();
    const gvId   = parseInt(document.getElementById('f-gv').value);

    // Validate
    if (!msv)    { showToast('Vui lòng nhập Mã số sinh viên!', 'error'); return; }
    if (!hoTen)  { showToast('Vui lòng nhập Họ tên sinh viên!', 'error'); return; }
    if (!nganhId){ showToast('Vui lòng chọn Ngành học!', 'error'); return; }
    if (!lop)    { showToast('Vui lòng nhập Lớp!', 'error'); return; }
    if (!gvId)   { showToast('Vui lòng chọn Giảng viên hướng dẫn!', 'error'); return; }

    // Disable nút tránh double-submit
    const btn = document.querySelector('.btn-register');
    btn.disabled = true;
    btn.textContent = '⏳ Đang xử lý...';

    try {
      // Kiểm tra MSSV đã đăng ký chưa
      const existed = await DB.checkMsvExists(msv);
      if (existed) {
        showToast(`MSSV ${msv} đã đăng ký trước đó. Mỗi sinh viên chỉ đăng ký một lần!`, 'error');
        btn.disabled = false;
        btn.textContent = '📝 Đăng Ký Ngay';
        return;
      }

      const nganh = state.nganhList.find(n => n.id === nganhId);
      const gvSel = document.getElementById('f-gv');
      const gvName = gvSel.options[gvSel.selectedIndex]?.text || '';

      await DB.addDangKy({ msv, ho_ten: hoTen, lop, nganh_id: nganhId, giang_vien_id: gvId });

      // Hiển thị success overlay
      document.getElementById('success-msg').innerHTML = `
        <strong>Mã số sinh viên:</strong> ${escHtml(msv)}<br>
        <strong>Họ và tên:</strong> ${escHtml(hoTen)}<br>
        <strong>Lớp:</strong> ${escHtml(lop)}<br>
        <strong>Ngành học:</strong> ${escHtml(nganh?.ten_nganh || '')}<br>
        <strong>Giảng viên hướng dẫn:</strong> ${escHtml(gvName.split(' —')[0])}
      `;
      document.getElementById('success-overlay').classList.remove('hidden');
    } catch (err) {
      showToast('Lỗi đăng ký: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '📝 Đăng Ký Ngay';
    }
  }

  // ── ADMIN: NGÀNH HỌC ─────────────────────────────────────────────────────
  function renderAdminNganhList() {
    const container = document.getElementById('nganh-list');
    if (!container) return;

    if (state.nganhList.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎓</div>
          <h3>Chưa có ngành học nào</h3>
          <p>Nhấn <strong>+ Thêm ngành</strong> để bắt đầu.</p>
        </div>`;
      return;
    }

    // Đếm GV theo ngành
    const gvCountByNganh = {};
    state.gvList.forEach(gv => {
      gvCountByNganh[gv.nganh_id] = (gvCountByNganh[gv.nganh_id] || 0) + 1;
    });
    // Đếm SV đăng ký theo ngành
    const svCountByNganh = {};
    state.dangKyList.forEach(dk => {
      const nid = dk.nganh_hoc?.id || dk.nganh_id;
      if (nid) svCountByNganh[nid] = (svCountByNganh[nid] || 0) + 1;
    });

    container.innerHTML = `<div class="nganh-grid">` +
      state.nganhList.map(n => `
        <div class="nganh-card">
          <div class="nganh-card-top">
            <div class="nganh-card-name">${escHtml(n.ten_nganh)}</div>
            <div class="actions">
              <button class="btn btn-ghost btn-sm" onclick="App.openEditNganh(${n.id})" title="Sửa">✏️</button>
              <button class="btn btn-ghost btn-sm" onclick="App.deleteNganh(${n.id})" title="Xóa" style="color:var(--danger)">🗑️</button>
            </div>
          </div>
          ${n.mo_ta ? `<p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.5rem;">${escHtml(n.mo_ta)}</p>` : ''}
          <div class="nganh-card-meta">
            <span class="badge badge-primary">👨‍🏫 ${gvCountByNganh[n.id] || 0} giảng viên</span>
            <span class="badge badge-success">🎓 ${svCountByNganh[n.id] || 0} sinh viên</span>
          </div>
        </div>`
      ).join('') + `</div>`;
  }

  function openAddNganh() {
    openModal('➕ Thêm ngành học', `
      <div class="form-group">
        <label class="form-label required">Tên ngành học</label>
        <input id="m-nganh-ten" class="input" placeholder="VD: Công nghệ thông tin" />
      </div>
      <div class="form-group">
        <label class="form-label">Mô tả</label>
        <input id="m-nganh-mota" class="input" placeholder="Mô tả ngắn (tùy chọn)" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="App.submitAddNganh()">💾 Lưu</button>
      </div>`);
  }

  async function submitAddNganh() {
    const ten  = document.getElementById('m-nganh-ten').value.trim();
    const mota = document.getElementById('m-nganh-mota').value.trim();
    if (!ten) { showToast('Vui lòng nhập tên ngành!', 'error'); return; }
    try {
      const n = await DB.addNganh(ten, mota);
      state.nganhList.push(n);
      state.nganhList.sort((a,b) => a.ten_nganh.localeCompare(b.ten_nganh));
      closeModal();
      renderAdminNganhList();
      renderNganhSelect('f-nganh');
      populateFilterSelects();
      showToast(`Đã thêm ngành "${ten}"!`, 'success');
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
  }

  function openEditNganh(id) {
    const n = state.nganhList.find(x => x.id === id);
    if (!n) return;
    openModal('✏️ Sửa ngành học', `
      <div class="form-group">
        <label class="form-label required">Tên ngành học</label>
        <input id="m-nganh-ten" class="input" value="${escHtml(n.ten_nganh)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Mô tả</label>
        <input id="m-nganh-mota" class="input" value="${escHtml(n.mo_ta||'')}" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="App.submitEditNganh(${id})">💾 Cập nhật</button>
      </div>`);
  }

  async function submitEditNganh(id) {
    const ten  = document.getElementById('m-nganh-ten').value.trim();
    const mota = document.getElementById('m-nganh-mota').value.trim();
    if (!ten) { showToast('Vui lòng nhập tên ngành!', 'error'); return; }
    try {
      const updated = await DB.updateNganh(id, { ten_nganh: ten, mo_ta: mota });
      const idx = state.nganhList.findIndex(x => x.id === id);
      if (idx !== -1) state.nganhList[idx] = updated;
      state.nganhList.sort((a,b) => a.ten_nganh.localeCompare(b.ten_nganh));
      closeModal();
      renderAdminNganhList();
      renderNganhSelect('f-nganh');
      populateFilterSelects();
      showToast('Đã cập nhật ngành!', 'success');
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
  }

  async function deleteNganh(id) {
    const n = state.nganhList.find(x => x.id === id);
    if (!confirm(`Xóa ngành "${n?.ten_nganh}"?\nCác giảng viên và đăng ký của ngành này cũng sẽ bị xóa!`)) return;
    try {
      await DB.deleteNganh(id);
      state.nganhList   = state.nganhList.filter(x => x.id !== id);
      state.gvList      = state.gvList.filter(x => x.nganh_id !== id);
      state.dangKyList  = state.dangKyList.filter(x => x.nganh_hoc?.id !== id);
      renderAdminNganhList();
      renderGvList();
      renderDanhSach();
      renderNganhSelect('f-nganh');
      populateFilterSelects();
      showToast('Đã xóa ngành!', 'success');
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
  }

  // ── ADMIN: GIẢNG VIÊN ────────────────────────────────────────────────────
  function renderGvList() {
    const container = document.getElementById('gv-list');
    if (!container) return;

    const filterNganh = parseInt(document.getElementById('filter-nganh-gv')?.value) || 0;
    const filtered = filterNganh
      ? state.gvList.filter(gv => gv.nganh_id === filterNganh)
      : state.gvList;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👨‍🏫</div>
          <h3>Chưa có giảng viên nào</h3>
          <p>Nhấn <strong>+ Thêm giảng viên</strong> để bắt đầu.</p>
        </div>`;
      return;
    }

    const rows = filtered.map((gv, idx) => {
      const daDangKy = state.svCountByGv[gv.id] || 0;
      const toiDa    = gv.so_luong_toi_da || 0;
      const conLai   = toiDa > 0 ? toiDa - daDangKy : '—';
      const hetCho   = toiDa > 0 && daDangKy >= toiDa;
      return `
        <tr>
          <td class="td-stt">${idx + 1}</td>
          <td><strong>${escHtml(gv.ho_ten)}</strong>${gv.hoc_vi ? `<br><span style="font-size:0.78rem;color:var(--text-muted)">${escHtml(gv.hoc_vi)}</span>` : ''}</td>
          <td>${escHtml(gv.nganh_hoc?.ten_nganh || '—')}</td>
          <td style="text-align:center;">${toiDa > 0 ? toiDa : '—'}</td>
          <td style="text-align:center;">${daDangKy}</td>
          <td style="text-align:center;">
            ${toiDa > 0
              ? `<span class="badge ${hetCho ? 'badge-warning' : 'badge-success'}">${hetCho ? 'Hết chỗ' : conLai + ' chỗ'}</span>`
              : '<span class="badge badge-gray">Không giới hạn</span>'}
          </td>
          <td>${escHtml(gv.email || '—')}</td>
          <td>
            <div class="actions">
              <button class="btn btn-ghost btn-sm" onclick="App.openEditGv(${gv.id})" title="Sửa">✏️</button>
              <button class="btn btn-ghost btn-sm" onclick="App.deleteGv(${gv.id})" title="Xóa" style="color:var(--danger)">🗑️</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th class="td-stt">STT</th>
              <th>Họ tên / Học vị</th>
              <th>Ngành phụ trách</th>
              <th style="text-align:center;">Tối đa SV</th>
              <th style="text-align:center;">Đã đăng ký</th>
              <th style="text-align:center;">Còn lại</th>
              <th>Email</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function gvFormHtml(gv = {}) {
    const nganhOpts = state.nganhList.map(n =>
      `<option value="${n.id}" ${n.id == gv.nganh_id ? 'selected' : ''}>${escHtml(n.ten_nganh)}</option>`
    ).join('');
    return `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label required">Họ và tên giảng viên</label>
          <input id="m-gv-hoten" class="input" placeholder="Nguyễn Văn A"
            value="${escHtml(gv.ho_ten||'')}" />
        </div>
        <div class="form-group">
          <label class="form-label">Học vị / Chức danh</label>
          <input id="m-gv-hocvi" class="input" placeholder="TS., ThS., GVC..."
            value="${escHtml(gv.hoc_vi||'')}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label required">Ngành phụ trách</label>
          <select id="m-gv-nganh" class="input">
            <option value="">-- Chọn ngành --</option>
            ${nganhOpts}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Số SV tối đa</label>
          <input id="m-gv-soluong" class="input" type="number" min="0"
            placeholder="0 = không giới hạn"
            value="${gv.so_luong_toi_da || 0}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input id="m-gv-email" class="input" type="email" placeholder="gv@email.com"
          value="${escHtml(gv.email||'')}" />
      </div>`;
  }

  function openAddGv() {
    openModal('➕ Thêm giảng viên', gvFormHtml() + `
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="App.submitAddGv()">💾 Lưu</button>
      </div>`);
  }

  async function submitAddGv() {
    const hoTen   = document.getElementById('m-gv-hoten').value.trim();
    const hocVi   = document.getElementById('m-gv-hocvi').value.trim();
    const nganhId = parseInt(document.getElementById('m-gv-nganh').value);
    const soLuong = parseInt(document.getElementById('m-gv-soluong').value) || 0;
    const email   = document.getElementById('m-gv-email').value.trim();
    if (!hoTen)   { showToast('Vui lòng nhập họ tên giảng viên!', 'error'); return; }
    if (!nganhId) { showToast('Vui lòng chọn ngành!', 'error'); return; }
    try {
      const gv = await DB.addGiangVien({ ho_ten: hoTen, hoc_vi: hocVi, nganh_id: nganhId, so_luong_toi_da: soLuong, email });
      // Gắn thêm nganh_hoc cho cache
      gv.nganh_hoc = state.nganhList.find(n => n.id === nganhId) || {};
      state.gvList.push(gv);
      state.gvList.sort((a,b) => a.ho_ten.localeCompare(b.ho_ten));
      closeModal();
      renderGvList();
      renderAdminNganhList();
      showToast(`Đã thêm GV "${hoTen}"!`, 'success');
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
  }

  function openEditGv(id) {
    const gv = state.gvList.find(x => x.id === id);
    if (!gv) return;
    openModal('✏️ Sửa giảng viên', gvFormHtml(gv) + `
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="App.submitEditGv(${id})">💾 Cập nhật</button>
      </div>`);
  }

  async function submitEditGv(id) {
    const hoTen   = document.getElementById('m-gv-hoten').value.trim();
    const hocVi   = document.getElementById('m-gv-hocvi').value.trim();
    const nganhId = parseInt(document.getElementById('m-gv-nganh').value);
    const soLuong = parseInt(document.getElementById('m-gv-soluong').value) || 0;
    const email   = document.getElementById('m-gv-email').value.trim();
    if (!hoTen)   { showToast('Vui lòng nhập họ tên!', 'error'); return; }
    if (!nganhId) { showToast('Vui lòng chọn ngành!', 'error'); return; }
    try {
      const updated = await DB.updateGiangVien(id, { ho_ten: hoTen, hoc_vi: hocVi, nganh_id: nganhId, so_luong_toi_da: soLuong, email });
      updated.nganh_hoc = state.nganhList.find(n => n.id === nganhId) || {};
      const idx = state.gvList.findIndex(x => x.id === id);
      if (idx !== -1) state.gvList[idx] = updated;
      closeModal();
      renderGvList();
      renderAdminNganhList();
      showToast('Đã cập nhật!', 'success');
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
  }

  async function deleteGv(id) {
    const gv = state.gvList.find(x => x.id === id);
    if (!confirm(`Xóa giảng viên "${gv?.ho_ten}"?`)) return;
    try {
      await DB.deleteGiangVien(id);
      state.gvList = state.gvList.filter(x => x.id !== id);
      renderGvList();
      renderAdminNganhList();
      showToast('Đã xóa giảng viên!', 'success');
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
  }

  // ── ADMIN: DANH SÁCH ĐĂNG KÝ ─────────────────────────────────────────────
  function renderDanhSach() {
    const container = document.getElementById('ds-list');
    if (!container) return;

    const filterNganh = parseInt(document.getElementById('filter-nganh-ds')?.value) || 0;
    const search      = (document.getElementById('filter-search')?.value || '').toLowerCase().trim();

    let list = [...state.dangKyList];
    if (filterNganh) list = list.filter(dk => {
      const nid = dk.nganh_id || dk.nganh_hoc?.id;
      return nid == filterNganh;
    });
    if (search) list = list.filter(dk =>
      dk.msv?.toLowerCase().includes(search) ||
      dk.ho_ten?.toLowerCase().includes(search) ||
      dk.lop?.toLowerCase().includes(search)
    );

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>Chưa có sinh viên đăng ký</h3>
          <p>${search || filterNganh ? 'Không có kết quả phù hợp.' : 'Sinh viên chưa thực hiện đăng ký.'}</p>
        </div>`;
      return;
    }

    const rows = list.map((dk, idx) => `
      <tr>
        <td class="td-stt">${idx + 1}</td>
        <td><strong>${escHtml(dk.msv)}</strong></td>
        <td>${escHtml(dk.ho_ten)}</td>
        <td>${escHtml(dk.nganh_hoc?.ten_nganh || '—')}</td>
        <td>${escHtml(dk.lop)}</td>
        <td>${escHtml(dk.giang_vien?.ho_ten || '—')}${dk.giang_vien?.hoc_vi ? ` <span style="font-size:0.78rem;color:var(--text-muted)">(${escHtml(dk.giang_vien.hoc_vi)})</span>` : ''}</td>
        <td style="font-size:0.8rem;color:var(--text-muted);">${new Date(dk.created_at).toLocaleString('vi-VN')}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="App.deleteDangKy(${dk.id})"
            style="color:var(--danger)" title="Xóa đăng ký">🗑️</button>
        </td>
      </tr>`).join('');

    container.innerHTML = `
      <div style="padding:0.6rem 1rem;font-size:0.82rem;color:var(--text-muted);border-bottom:1px solid var(--border);">
        Hiển thị <strong>${list.length}</strong> / ${state.dangKyList.length} sinh viên đăng ký
      </div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th class="td-stt">STT</th>
              <th>MSSV</th>
              <th>Họ tên</th>
              <th>Ngành học</th>
              <th>Lớp</th>
              <th>Giảng viên hướng dẫn</th>
              <th>Thời gian</th>
              <th>Xóa</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  async function deleteDangKy(id) {
    if (!confirm('Xóa đăng ký này? Sinh viên sẽ có thể đăng ký lại.')) return;
    try {
      await DB.deleteDangKy(id);
      state.dangKyList = state.dangKyList.filter(x => x.id !== id);
      // Cập nhật lại svCountByGv
      state.svCountByGv = await DB.countSvByGv();
      renderDanhSach();
      renderAdminNganhList();
      renderGvList();
      showToast('Đã xóa đăng ký!', 'success');
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
  }

  // ── XUẤT EXCEL ────────────────────────────────────────────────────────────
  function exportExcel() {
    if (!window.XLSX) { showToast('Thư viện Excel chưa tải xong!', 'error'); return; }

    const filterNganh = parseInt(document.getElementById('filter-nganh-ds')?.value) || 0;
    let list = [...state.dangKyList];
    if (filterNganh) list = list.filter(dk => {
      const nid = dk.nganh_id || dk.nganh_hoc?.id;
      return nid == filterNganh;
    });

    if (list.length === 0) { showToast('Không có dữ liệu để xuất!', 'warning'); return; }

    const nganhName = filterNganh
      ? (state.nganhList.find(n => n.id === filterNganh)?.ten_nganh || 'Tất cả')
      : 'Tất cả ngành';

    // Header row
    const wsData = [
      [`DANH SÁCH SINH VIÊN ĐĂNG KÝ GIẢNG VIÊN HƯỚNG DẪN THỰC TẬP`],
      [`Ngành: ${nganhName}`],
      [`Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`],
      [],
      ['STT', 'Mã số sinh viên', 'Họ tên sinh viên', 'Ngành học', 'Lớp', 'Giảng viên hướng dẫn'],
      ...list.map((dk, i) => [
        i + 1,
        dk.msv,
        dk.ho_ten,
        dk.nganh_hoc?.ten_nganh || '',
        dk.lop,
        (dk.giang_vien?.hoc_vi ? dk.giang_vien.hoc_vi + ' ' : '') + (dk.giang_vien?.ho_ten || ''),
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Định dạng cột
    ws['!cols'] = [
      { wch: 5 }, { wch: 16 }, { wch: 30 }, { wch: 28 }, { wch: 12 }, { wch: 30 },
    ];
    // Merge tiêu đề
    ws['!merges'] = [
      { s: { r:0, c:0 }, e: { r:0, c:5 } },
      { s: { r:1, c:0 }, e: { r:1, c:5 } },
      { s: { r:2, c:0 }, e: { r:2, c:5 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách đăng ký');

    const fileName = `DangKyGVHD_${nganhName.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast(`Xuất Excel thành công! (${list.length} dòng)`, 'success');
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

  // Public API
  return {
    // Views
    showView, toggleAdminLogin, doAdminLogin, logout,
    switchAdminTab,
    // Form sinh viên
    onNganhChange, onGvChange, submitRegister, closeSuccess,
    // Modal
    closeModal,
    // Admin ngành
    openAddNganh, submitAddNganh, openEditNganh, submitEditNganh, deleteNganh,
    // Admin GV
    openAddGv, submitAddGv, openEditGv, submitEditGv, deleteGv,
    // Admin DS
    renderGvList, renderDanhSach, deleteDangKy, exportExcel,
  };
})();
