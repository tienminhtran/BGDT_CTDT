// Escape để chèn dữ liệu vào HTML in không vỡ layout / không dính XSS.
const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Dựng 1 bảng con (chi tiết) lồng trong 1 ô -> in kèm dưới mỗi dòng chính.
function bangChiTiet(ct, soCotCha) {
  const thead = `
    <tr>
      <th style="width:36px">STT</th>
      ${ct.cot.map((c) => `<th class="${c.align || 'left'}">${esc(c.label)}</th>`).join('')}
    </tr>`
  const tbody = ct.dong
    .map(
      (o, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        ${ct.cot.map((c, j) => `<td class="${c.align || 'left'}">${esc(o[j])}</td>`).join('')}
      </tr>`
    )
    .join('')

  return `
    <tr class="ct-row">
      <td colspan="${soCotCha}">
        ${ct.tieuDe ? `<div class="ct-title">${esc(ct.tieuDe)}</div>` : ''}
        <table class="ct">
          <thead>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
      </td>
    </tr>`
}

/**
 * Mở cửa sổ in với 1 bảng đã định dạng (header xanh, kẻ ô) rồi bật hộp thoại in
 * của trình duyệt — người dùng chọn "Lưu dưới dạng PDF" để xuất PDF.
 * In xong HOẶC bấm huỷ đều tự đóng cửa sổ (xử lý bằng script trong chính cửa sổ đó).
 *
 * @param {object} opts
 * @param {string} opts.tieuDe            tiêu đề in trên đầu trang
 * @param {Array<{label, align?}>} opts.cot   cột in (chỉ cột dữ liệu, không gồm STT)
 * @param {Array<{o: Array, chiTiet?: {tieuDe?, cot, dong}}>} opts.dong
 *        mỗi dòng: o = mảng ô theo thứ tự cột; chiTiet (tuỳ chọn) = bảng con in lồng bên dưới
 * @param {string} [opts.ghiChu]          dòng chú thích nhỏ dưới tiêu đề
 */
export function inBang({ tieuDe, cot, dong, ghiChu }) {
  const ngay = new Date().toLocaleString('vi-VN')
  const soCotCha = 1 + cot.length // +1: cột STT

  const thead = `
    <tr>
      <th style="width:44px">STT</th>
      ${cot.map((c) => `<th class="${c.align || 'left'}">${esc(c.label)}</th>`).join('')}
    </tr>`

  const tbody = dong
    .map((d, i) => {
      const dongChinh = `
      <tr class="chinh">
        <td class="center">${i + 1}</td>
        ${cot.map((c, j) => `<td class="${c.align || 'left'}">${esc(d.o[j])}</td>`).join('')}
      </tr>`
      return d.chiTiet && d.chiTiet.dong?.length
        ? dongChinh + bangChiTiet(d.chiTiet, soCotCha)
        : dongChinh
    })
    .join('')

  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${esc(tieuDe)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Roboto, system-ui, sans-serif; color: #1e293b; margin: 24px; }
  h1 { color: #115EA8; font-size: 20px; margin: 0 0 4px; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #94a3b8; padding: 6px 8px; vertical-align: top; }
  thead th { background: #115EA8; color: #fff; font-weight: 600; }
  tbody tr.chinh:nth-of-type(2n) { background: #f1f5f9; }
  .center { text-align: center; }
  .right { text-align: right; }
  .left { text-align: left; }

  /* Bảng con (chi tiết chương) lồng dưới mỗi dòng chính */
  .ct-row > td { background: #fffbeb; padding: 8px 8px 10px; }
  .ct-title { font-weight: 600; color: #115EA8; margin-bottom: 4px; }
  table.ct { font-size: 11px; }
  table.ct thead th { background: #64748b; }
  table.ct tbody tr:nth-child(2n) { background: #f8fafc; }

  @media print {
    body { margin: 0; }
    thead { display: table-header-group; }  /* lặp header ở mỗi trang in */
    tr { break-inside: avoid; }
  }
</style>
<script>
  // In ngay khi tải xong; in xong hoặc bấm huỷ (onafterprint) thì tự đóng cửa sổ.
  window.onload = function () {
    window.focus();
    window.onafterprint = function () { window.close(); };
    window.print();
  };
</script>
</head>
<body>
  <h1>${esc(tieuDe)}</h1>
  <div class="meta">Xuất lúc ${esc(ngay)} · ${dong.length} dòng${ghiChu ? ` · ${esc(ghiChu)}` : ''}</div>
  <table>
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) return false // popup bị chặn

  w.document.write(html)
  w.document.close()
  return true
}
