import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ExternalLink } from 'lucide-react';
import http from '../api/http';

const LMS_BASE = 'https://lms.iuh.edu.vn';

function ProgressBar({ value }) {
  const pct = Math.round(value ?? 0);
  return (
    <div className="mt-3">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-green-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="mt-1 block text-xs text-slate-500">Tiến độ {pct}%</span>
    </div>
  );
}

export default function CourseList() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, courses: [], error: '' });
  const [path, setPath] = useState('');

  // Nhập "mã môn/phiên bản" (vd 2101420/1) hoặc dán cả URL -> Enter để vào học.
  // Quyền truy cập được kiểm tra ở trang bài giảng (theo mã môn).
  const goToLesson = (e) => {
    e.preventDefault();
    let v = path.trim();
    if (!v) return;

    // Nếu người dùng dán nguyên URL: lấy phần sau 'bai-giang-dien-tu/'
    const marker = 'bai-giang-dien-tu/';
    const idx = v.indexOf(marker);
    if (idx !== -1) v = v.slice(idx + marker.length);

    v = v.replace(/^\/+/, '').replace(/\/+$/, ''); // bỏ dấu / thừa
    if (v) navigate(`/bai-giang-dien-tu/${v}`);
  };

  useEffect(() => {
    // Không có wstoken (vào bằng phiên LMS qua extension) -> không gọi được API này
    if (!localStorage.getItem('moodle_token')) {
      setState({ loading: false, courses: [], error: 'no-token' });
      return;
    }
    http
      .get('/courses')
      .then((res) => setState({ loading: false, courses: res.data.courses, error: '' }))
      .catch((err) =>
        setState({
          loading: false,
          courses: [],
          error: err?.response?.data?.message || 'Không tải được danh sách môn học',
        })
      );
  }, []);

  if (state.loading) {
    return <p className="mt-8 text-slate-500">Đang tải môn học...</p>;
  }

  if (state.error === 'no-token') {
    return (
      <p className="mt-8 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
        Đăng nhập bằng tài khoản LMS (nút Đăng nhập) để xem danh sách môn học của bạn.
      </p>
    );
  }

  if (state.error) {
    return <p className="mt-8 text-red-600">{state.error}</p>;
  }

  if (!state.courses.length) {
    return <p className="mt-8 text-slate-500">Bạn chưa tham gia môn học nào.</p>;
  }

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-xl font-bold text-green-700">
        Môn học của bạn ({state.courses.length})
      </h2>

      {/* Ô nhập đường dẫn vào học: gõ mã môn/phiên bản rồi Enter */}
      Học máy:http://localhost:5173/bai-giang-dien-tu/2102470/1  <br />
      Học phần khác: http://localhost:5173/bai-giang-dien-tu/2101420/1  <br />
       <br />
      <form onSubmit={goToLesson} className="mb-6 flex gap-2">
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="Nhập đường dẫn vào học, vd: 2101420/1  (mã môn / phiên bản)"
          className="flex-1 rounded-sm border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 rounded-sm bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          <GraduationCap size={16} />
          Vào học
        </button>
      </form>

      <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.courses.map((c) => (
          <div
            key={c.id}
            className="flex h-full flex-col border border-slate-200 bg-white p-5 shadow-sm transition hover:border-green-300 hover:shadow-md"
          >
            <h3 className="line-clamp-2 min-h-[3rem] font-semibold text-slate-800">
              {c.fullname}
            </h3>
            <p className="mt-1 text-xs text-slate-400">{c.idnumber}</p>
            <ProgressBar value={c.progress} />

            {/* Nút vào khóa học trên LMS */}
            <div className="mt-auto pt-4">
              <a
                href={`${LMS_BASE}/course/view.php?id=${c.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-sm border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-green-400 hover:text-green-700"
              >
                <ExternalLink size={16} />
                Vào LMS
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
