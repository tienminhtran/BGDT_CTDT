import { FolderSearch } from 'lucide-react'
import PageHeading from '../components/PageHeading'

// Trang rỗng, chờ nội dung (lịch sử duyệt/thay đổi bài giảng - tb_LichSuDuyetBaiGiang).
export default function LichSuThayDoiPage() {
  return (
    <div>
      <PageHeading
        icon={FolderSearch}
        title="Lịch sử thay đổi"
        desc="Nhật ký thay đổi bài giảng"
      />

      <div className="border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        Chưa có nội dung.
      </div>
    </div>
  )
}
