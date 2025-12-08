export const PageHeader = ({ title, description }: { title: string; description?: string }) => (
  <div className="mb-6">
    <h2 className="text-2xl font-semibold text-slate-800">{title}</h2>
    {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
  </div>
);
