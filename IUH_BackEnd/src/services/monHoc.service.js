const { getPool } = require('../config/db');

/**
 * Danh sách môn học kèm các phiên bản (version) của môn.
 * @returns {Promise<Array<{ id, maTuQuan, tenMon, versions: Array<{id, version}> }>>}
 */
async function listMonHoc() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT mh.id AS monHocId, mh.ma_tuquan AS maTuQuan, mh.tenmon AS tenMon,
           mv.id AS versionId, mv.[version] AS version
    FROM tb_monhoc mh
    LEFT JOIN tb_monhoc_version mv ON mv.id_monhoc = mh.id
    ORDER BY mh.tenmon, mv.[version]
  `);

  const map = new Map();
  for (const r of result.recordset) {
    if (!map.has(r.monHocId)) {
      map.set(r.monHocId, {
        id: r.monHocId,
        maTuQuan: r.maTuQuan,
        tenMon: r.tenMon,
        versions: [],
      });
    }
    if (r.versionId != null) {
      map.get(r.monHocId).versions.push({ id: r.versionId, version: r.version });
    }
  }
  return [...map.values()];
}

module.exports = { listMonHoc };
