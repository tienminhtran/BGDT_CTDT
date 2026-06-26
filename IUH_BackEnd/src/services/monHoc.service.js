const { Monhoc, MonhocVersion,BaiGiang, ChiTietDangKyBaiGiang, DangKyBaiGiang} = require('../models/orm');
const { encodeCourse } = require('../utils/courseToken');
/**
 * Danh sách môn học kèm các phiên bản (version) của môn.
 * @returns {Promise<Array<{ id, maTuQuan, tenMon, versions: Array<{id, version}> }>>}
 */
async function listMonHoc() {
  const rows = await Monhoc.findAll({
    attributes: ['id', 'ma_tuquan', 'tenmon'],
    include: [
      {
        model: MonhocVersion,
        as: 'Versions',
        attributes: ['id', 'version'],
        required: false, // LEFT JOIN: môn chưa có phiên bản vẫn hiện
      },
    ],
    order: [
      ['tenmon', 'ASC'],
      [{ model: MonhocVersion, as: 'Versions' }, 'version', 'ASC'],
    ],
  });

  return rows.map((mh) => ({
    id: mh.id,
    maTuQuan: mh.ma_tuquan,
    tenMon: mh.tenmon,
    versions: (mh.Versions || []).map((v) => ({ id: v.id, version: v.version })),
  }));
}


// API lấy danh sách môn học, phiên bản môn học, hashcode Bài giảng (môn học + phiên bản môn học)
async function getMonHocListWithHashcode() {
const rows = await BaiGiang.findAll({
    attributes: ['Id'],
    include: [{
        model: ChiTietDangKyBaiGiang,
        as: 'ChiTiet',
        attributes: ['Id'],
        include: [{
            model: DangKyBaiGiang,
            as: 'DangKy',
            attributes: ['Id', 'MonHocVersionId'],
            include: [{
                model: MonhocVersion,
                as: 'MonHocVersion',
                attributes: ['id', 'version'],
                include: [{
                    model: Monhoc,
                    as: 'Monhoc',
                    attributes: ['id', 'ma_tuquan', 'tenmon']
                }]
            }]
        }]
    }]
});

  // Loại bỏ các môn học + version bị trùng
  const map = new Map();

  rows.forEach((bg) => {
    const monHocVersion = bg.ChiTiet.DangKy.MonHocVersion;
    const monHoc = monHocVersion.Monhoc;

    const key = `${monHoc.ma_tuquan}_${monHocVersion.version}`;

    if (!map.has(key)) {
      map.set(key, {
        maMon: monHoc.ma_tuquan,
        tenMon: monHoc.tenmon,
        version: monHocVersion.version,
        hashcode: encodeCourse({
          maMon: monHoc.ma_tuquan,
          version: monHocVersion.version,
        }),
      });
    }
  });

  return [...map.values()];
}

module.exports = { listMonHoc, getMonHocListWithHashcode };
