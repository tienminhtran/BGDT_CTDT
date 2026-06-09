import { useState } from 'react';

export default function LoginModal({ onLogin, onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Sai tài khoản hoặc mật khẩu LMS'
      );
    } finally {
      setLoading(false);
      setPassword(''); // không giữ mật khẩu trong state sau khi submit
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      onClick={onClose}
    >
      {/* Cửa sổ phụ đăng nhập LMS */}
      <div
        className="w-[400px] max-w-full overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Thanh tiêu đề giả lập cửa sổ */}
        <div className="flex items-center justify-between bg-blue-900 px-4 py-2.5 text-white">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400" />
            lms.iuh.edu.vn — Đăng nhập
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded p-1 text-white/80 hover:bg-white/20 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-7 text-center">
          <img
            src="/iuh-logo.png"
            alt="IUH"
            className="mx-auto h-16 w-16 object-contain"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <h3 className="text-xl font-semibold text-blue-900">Đăng nhập IUH LMS</h3>
          <p className="text-sm text-gray-500">
            Dùng tài khoản LMS của bạn để tiếp tục
          </p>

          <input
            type="text"
            placeholder="MSSV / Tài khoản"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-[0.95rem] outline-none focus:border-blue-900"
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-[0.95rem] outline-none focus:border-blue-900"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="mt-1 rounded-lg bg-blue-900 py-2.5 text-base text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
