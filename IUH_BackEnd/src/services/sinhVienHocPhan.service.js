const { Op, fn, col } = require('sequelize');
const { SinhVienHocPhan, HocPhanMonHoc, LoginAttempt } = require('../models/orm');
const loginGuard = require('./loginGuard.service');

/**
 * Cắt bỏ 2 ký tự cuối của mã học phần.
 *
 * idnumber lấy từ LMS có 2 số đuôi (vd đợt/lần mở lớp) không thuộc MaHocPhan gốc,
 * nên khi lưu vào DB và khi đối chiếu với tb_HocPhanMonHoc đều phải cắt đi cho khớp.
 * Vd: '420300111104' -> '4203001111'. Mã rỗng hoặc <= 2 ký tự thì giữ nguyên.
 */
function catHaiSoCuoi(ma) {
  const s = String(ma ?? '').trim();
  return s.length > 2 ? s.slice(0, -2) : s;
}

// Lấy danh sách MaHocPhan (idnumber) của 1 sinh viên theo MSSV
async function getHocPhanByMssv(mssv) {
  const rows = await SinhVienHocPhan.findAll({
    attributes: ['MaHocPhan'],
    where: { MaSinhVien: mssv },
  });
  return rows.map((r) => r.MaHocPhan);
}

// Import danh sách idnumber cho SV: chỉ thêm những học phần SV chưa có.
// Mỗi idnumber được cắt 2 số cuối trước khi lưu (xem catHaiSoCuoi).
async function importHocPhan(mssv, idnumbers) {
  const list = [...new Set((idnumbers || []).map(catHaiSoCuoi).filter(Boolean))];
  if (!list.length) return { added: 0, skipped: 0, total: 0 };

  const existing = new Set(await getHocPhanByMssv(mssv));
  const toAdd = list.filter((x) => !existing.has(x));

  if (toAdd.length) {
    await SinhVienHocPhan.bulkCreate(
      toAdd.map((maHocPhan) => ({ MaSinhVien: mssv, MaHocPhan: maHocPhan }))
    );
  }

  return { added: toAdd.length, skipped: list.length - toAdd.length, total: list.length };
}

/**
 * Kiểm tra 1 sinh viên có được học môn (MaMon) hay không.
 *
 * Điều kiện: SV phải thuộc một học phần (tb_SinhVienHocPhan) và học phần đó
 * có chứa đúng môn cần học (tb_HocPhanMonHoc). Tức là tồn tại đường nối:
 *   MaSinhVien -> MaHocPhan -> MaMon
 *
 * @returns {Promise<{ allowed: boolean, maHocPhan: string | null }>}
 *   allowed: SV có quyền học môn này; maHocPhan: học phần khớp đầu tiên (nếu có).
 */
async function kiemTraSinhVienHocMon(mssv, maMon) {
  if (!mssv || !maMon) return { allowed: false, maHocPhan: null };

  const row = await SinhVienHocPhan.findOne({
    attributes: ['MaHocPhan'],
    where: { MaSinhVien: mssv },
    include: [
      {
        model: HocPhanMonHoc,
        as: 'MonHocList',
        attributes: [],
        required: true, // INNER JOIN: chỉ lấy khi học phần có đúng môn
        where: { MaMon: maMon },
      },
    ],
  });

  const maHocPhan = row?.MaHocPhan ?? null;
  return { allowed: maHocPhan != null, maHocPhan };
}

/**
 * Tra map MaHocPhan -> [MaMon] cho 1 danh sách học phần (1 query gộp).
 * Dùng để gắn MaMon vào danh sách khóa học (idnumber = MaHocPhan) trả cho FE.
 *
 * @param {string[]} maHocPhanList
 * @returns {Promise<Record<string, string[]>>}
 */
async function getMonHocByHocPhan(maHocPhanList) {
  const list = [...new Set((maHocPhanList || []).map(catHaiSoCuoi).filter(Boolean))];
  if (!list.length) return {};

  const rows = await HocPhanMonHoc.findAll({
    attributes: ['MaHocPhan', 'MaMon'],
    where: { MaHocPhan: { [Op.in]: list } },
  });

  const map = {};
  for (const row of rows) {
    (map[row.MaHocPhan] ??= []).push(row.MaMon);
  }
  return map;
}

/**
 * Danh sách sinh viên cho màn "Thông tin sinh viên":
 * mỗi SV 1 dòng (gộp từ tb_SinhVienHocPhan) kèm trạng thái đăng nhập lấy từ
 * bộ đếm chống dò mật khẩu (tb_LoginAttempt).
 *
 * Trả về TOÀN BỘ danh sách, FE tự tìm kiếm/phân trang (số SV ở quy mô này còn nhỏ).
 * Khi dữ liệu lớn lên thì chuyển sang phân trang phía server.
 *
 * @returns {Promise<Array<{ mssv, soHocPhan, soLanSai, dangKhoa, khoaConLai }>>}
 */
async function danhSachSinhVien() {
  const rows = await SinhVienHocPhan.findAll({
    attributes: ['MaSinhVien', [fn('COUNT', col('MaHocPhan')), 'soHocPhan']],
    group: ['MaSinhVien'],
    order: [['MaSinhVien', 'ASC']],
    raw: true,
  });

  // loginGuard lưu ScopeKey là username đã chuẩn hóa (trim + lowercase).
  const khoa = (mssv) => String(mssv ?? '').trim().toLowerCase();

  const attempts = await LoginAttempt.findAll({
    attributes: ['Scope', 'ScopeKey', 'FailCount', 'ExpiresAt'],
    where: {
      Scope: { [Op.in]: ['lock', 'user'] },
      ScopeKey: { [Op.in]: rows.map((r) => khoa(r.MaSinhVien)) },
      ExpiresAt: { [Op.gt]: new Date() }, // hết hạn = coi như không có
    },
    raw: true,
  });

  const dangKhoa = new Map(); // mssv -> thời điểm mở khóa
  const soLanSai = new Map(); // mssv -> số lần sai trong cửa sổ hiện tại
  for (const a of attempts) {
    if (a.Scope === 'lock') dangKhoa.set(a.ScopeKey, a.ExpiresAt);
    else soLanSai.set(a.ScopeKey, a.FailCount);
  }

  const bayGio = Date.now();
  return rows.map((r) => {
    const k = khoa(r.MaSinhVien);
    const moKhoaLuc = dangKhoa.get(k);
    return {
      mssv: r.MaSinhVien,
      soHocPhan: Number(r.soHocPhan) || 0,
      soLanSai: soLanSai.get(k) ?? 0,
      dangKhoa: !!moKhoaLuc,
      khoaConLai: moKhoaLuc
        ? Math.max(0, Math.ceil((new Date(moKhoaLuc).getTime() - bayGio) / 1000))
        : 0,
    };
  });
}

/**
 * Xóa 1 sinh viên khỏi bảng học phần (mất hết ánh xạ SV -> học phần, tức SV sẽ
 * không xem được bài giảng nào nữa) và dọn luôn bộ đếm đăng nhập của SV đó.
 * @returns {Promise<number>} số dòng học phần đã xóa
 */
async function xoaSinhVien(mssv) {
  const daXoa = await SinhVienHocPhan.destroy({ where: { MaSinhVien: mssv } });
  await loginGuard.moKhoaTaiKhoan(mssv);
  return daXoa;
}

module.exports = {
  catHaiSoCuoi,
  getHocPhanByMssv,
  importHocPhan,
  kiemTraSinhVienHocMon,
  getMonHocByHocPhan,
  danhSachSinhVien,
  xoaSinhVien,
};
