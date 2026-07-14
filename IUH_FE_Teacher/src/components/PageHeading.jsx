// Tiêu đề dùng chung cho các trang quản lý.
// Tách khỏi QuanLyLayout để tránh vòng import: QuanLyLayout -> KeepAliveOutlet -> pages -> PageHeading.
export default function PageHeading({ icon: Icon, title, desc }) {
  return (
    <div className="mb-5">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-[#115EA8] sm:text-xl">
        <Icon size={22} className="shrink-0" /> {title}
      </h1>
      {desc && <p className="mt-1 text-sm text-gray-500">{desc}</p>}
    </div>
  )
}
