// Header sederhana untuk judul halaman dan deskripsi singkat.
export const PageHeader = ({ title, description }: { title: string; description?: string }) => (
  <div className="mb-6 rounded-2xl bg-mist/80 p-4">
    <p className="text-xs uppercase tracking-[0.3em] text-primary/70">Update Klinik</p>
    <h2 className="text-2xl font-bold text-secondary">{title}</h2>
    {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
  </div>
);
