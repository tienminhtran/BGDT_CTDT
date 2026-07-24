import { useCallback, useEffect, useState } from 'react'
import { Eye, EyeOff, X, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react'
import { authService, lmsService } from '../services'

// Ô nhập mật khẩu kèm nút hiện/ẩn — dùng lại cho cả 3 ô cho đồng nhất.
function OMatKhau({ label, value, onChange, placeholder, autoFocus }) {
  const [hien, setHien] = useState(false)

  return (
    <label className="block">
      <span className="mb-2 block text-[0.95rem] text-gray-700">
        {label}
        <span className="text-red-500">(*)</span>
      </span>
      <div className="relative">
        <input
          type={hien ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 px-4 py-3 pr-11 text-[0.95rem] text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-500"
        />
        <button
          type="button"
          onClick={() => setHien((h) => !h)}
          aria-label={hien ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          {hien ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  )
} 

/**
 * Đổi mật khẩu LMS.
 *
 * Không có mật khẩu riêng trong hệ thống này — backend đổi thẳng trên lms.iuh.edu.vn.
 * Vì vậy KHÔNG tự đặt luật độ dài/ký tự ở FE: chính sách mật khẩu do LMS quy định,
 * đặt luật ở đây chỉ khiến báo lỗi lệch với LMS. FE chỉ chặn 2 lỗi hiển nhiên
 * (nhập lại không khớp, mới trùng cũ), còn lại hiển thị nguyên văn lỗi LMS trả về.
 *
 * Sai mật khẩu cũ 2 lần -> backend bắt nhập captcha; ô captcha hiện thêm bên dưới.
 *
 * Trạng thái form do component này giữ và KHÔNG bị xóa khi submit lỗi: người dùng
 * chỉ cần sửa đúng ô sai (hoặc gõ thêm captcha) rồi bấm Lưu lại. Xóa khi đổi thành
 * công, hoặc khi đóng modal (component unmount).
 *
 * onDone: gọi sau khi đổi thành công (đăng xuất để SV đăng nhập lại bằng mật khẩu mới).
 */
export default function ChangePasswordModal({ onClose, onDone }) {
  const [matKhauCu, setMatKhauCu] = useState('')
  const [matKhauMoi, setMatKhauMoi] = useState('')
  const [xacNhan, setXacNhan] = useState('')
  const [loi, setLoi] = useState('')
  const [dangLuu, setDangLuu] = useState(false)
  const [xong, setXong] = useState(false)

  // Captcha: chỉ hiện khi backend yêu cầu (đã sai đủ số lần).
  const [canCaptcha, setCanCaptcha] = useState(false)
  const [captcha, setCaptcha] = useState(null) // { captchaToken, image }
  const [captchaText, setCaptchaText] = useState('')

  // Mỗi mã captcha chỉ dùng được 1 lần -> lấy mã mới sau mỗi lần submit hỏng.
  const lamMoiCaptcha = useCallback(async () => {
    setCaptchaText('')
    try {
      setCaptcha(await authService.getCaptcha())
    } catch (_) {
      setCaptcha(null) // hỏng thì để người dùng bấm nút tải lại
    }
  }, [])

  // Hỏi backend ngay khi mở modal: nếu lần trước đã sai nhiều thì hiện sẵn ô captcha,
  // đỡ phải bấm Lưu một lần chỉ để biết mình cần nhập captcha.
  useEffect(() => {
    let huy = false
    lmsService
      .getChangePasswordStatus()
      .then((s) => {
        if (huy || !s.captchaRequired) return
        setCanCaptcha(true)
        lamMoiCaptcha()
      })
      .catch(() => {}) // không chặn form nếu hỏi trạng thái lỗi
    return () => {
      huy = true
    }
  }, [lamMoiCaptcha])

  // Đóng modal. Không chặn lúc đang lưu / đã đổi xong để tránh đóng giữa chừng.
  const thuDong = useCallback(() => {
    if (dangLuu || xong) return
    onClose()
  }, [dangLuu, xong, onClose])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') thuDong()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [thuDong])

  const dayDu = matKhauCu && matKhauMoi && xacNhan && (!canCaptcha || captchaText)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoi('')

    if (matKhauMoi !== xacNhan) {
      setLoi('Xác nhận mật khẩu không khớp với mật khẩu mới')
      return
    }
    if (matKhauMoi === matKhauCu) {
      setLoi('Mật khẩu mới phải khác mật khẩu cũ')
      return
    }

    setDangLuu(true)
    try {
      await lmsService.changePassword(
        matKhauCu,
        matKhauMoi,
        canCaptcha ? { captchaToken: captcha?.captchaToken, captchaText } : undefined
      )
      // Chỉ tới đây mới xóa: đổi xong thì mật khẩu trong form không còn cần nữa.
      setMatKhauCu('')
      setMatKhauMoi('')
      setXacNhan('')
      setCaptchaText('')
      setXong(true)
      // Mật khẩu đã đổi -> phiên hiện tại không còn giá trị, cho SV đọc thông báo
      // rồi đưa về màn đăng nhập.
      setTimeout(() => onDone(), 2500)
    } catch (err) {
      const res = err?.response
      setLoi(
        res?.data?.code === 'NO_WEB_SESSION'
          ? 'Phiên làm việc với LMS đã hết hạn, vui lòng đăng xuất và đăng nhập lại'
          : res?.data?.message || 'Không đổi được mật khẩu, vui lòng thử lại'
      )
      // Backend bảo phải nhập captcha (428) hoặc từ lần sau phải nhập -> hiện ô captcha.
      // Giữ nguyên mật khẩu đã gõ, chỉ lấy mã captcha mới.
      if (res?.data?.captchaRequired) {
        setCanCaptcha(true)
        lamMoiCaptcha()
      }
    } finally {
      setDangLuu(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={thuDong}
    >
      <div
        className="relative w-[620px] max-w-full rounded-md bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Đổi mật khẩu"
      >
        {/* Nút đóng nhô ra góc phải như thiết kế */}
        {!xong && (
          <button
            type="button"
            onClick={thuDong}
            disabled={dangLuu}
            aria-label="Đóng"
            className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded bg-sky-500 text-white shadow-md transition hover:bg-sky-600 disabled:opacity-50 cursor-pointer"
          >
            <X size={20} />
          </button>
        )}

        {xong ? (
          <div className="flex flex-col items-center gap-3 px-8 py-12 text-center">
            <CheckCircle2 size={44} className="text-green-500" />
            <h3 className="text-lg font-semibold text-gray-800">Đổi mật khẩu thành công</h3>
            <p className="text-sm text-gray-500">
              Mật khẩu LMS của bạn đã được cập nhật. Đang đưa bạn về trang đăng nhập…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-8 py-9">
            {/* Đây KHÔNG phải mật khẩu riêng của web này — hệ thống dùng thẳng tài khoản
                LMS. Phải nói rõ, nếu không SV tưởng chỉ đổi mật khẩu trên web rồi mai
                đăng nhập LMS bằng mật khẩu cũ không được, lại tưởng mất tài khoản. */}
            <div className="flex gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-[0.85rem] leading-relaxed text-amber-900">
                <b>Lưu ý:</b> Tài khoản của bạn ở đây chính là tài khoản LMS. Đổi mật
                khẩu tại đây thì <b>mật khẩu LMS cũng đổi theo</b> — lần sau đăng nhập{' '}
                <a
                  href="https://lms.iuh.edu.vn/login/change_password.php?id=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2 hover:text-amber-700"
                >
                  lms.iuh.edu.vn
                </a>{' '}
                bạn phải dùng mật khẩu mới.
              </p>
            </div>

            <OMatKhau
              label="Mật khẩu cũ "
              value={matKhauCu}
              onChange={setMatKhauCu}
              placeholder="Nhập mật khẩu cũ"
              autoFocus
            />
            <OMatKhau
              label="Mật khẩu mới "
              value={matKhauMoi}
              onChange={setMatKhauMoi}
              placeholder="Nhập mật khẩu mới"
            />
            <OMatKhau
              label="Xác nhận mật khẩu "
              value={xacNhan}
              onChange={setXacNhan}
              placeholder="Xác nhận lại mật khẩu"
            />

            {canCaptcha && (
              <label className="block">
                <span className="mb-2 block text-[0.95rem] text-gray-700">
                  Mã xác nhận<span className="text-red-500">(*)</span>
                </span>
                <div className="flex items-center gap-3">
                  {captcha ? (
                    <img
                      src={captcha.image}
                      alt="Mã captcha"
                      className="h-[46px] rounded border border-gray-200"
                    />
                  ) : (
                    <span className="flex h-[46px] w-[160px] items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
                      Không tải được mã
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={lamMoiCaptcha}
                    aria-label="Lấy mã khác"
                    title="Lấy mã khác"
                    className="flex h-9 w-9 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
                  >
                    <RefreshCw size={18} />
                  </button>
                  <input
                    type="text"
                    value={captchaText}
                    onChange={(e) => setCaptchaText(e.target.value)}
                    placeholder="Nhập mã trong hình"
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-md border border-gray-300 px-4 py-3 text-[0.95rem] uppercase text-gray-700 outline-none placeholder:normal-case placeholder:text-gray-400 focus:border-blue-500"
                  />
                </div>
              </label>
            )}

            {loi && (
              <p className="text-sm text-red-600" role="alert">
                {loi}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!dayDu || dangLuu}
                className="min-w-[86px] rounded bg-sky-400 px-6 py-2.5 text-[0.95rem] text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-200 cursor-pointer"
              >
                {dangLuu ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
