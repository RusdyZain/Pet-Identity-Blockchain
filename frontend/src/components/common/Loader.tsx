export const Loader = ({ label = 'Loading...' }: { label?: string }) => {
  return (
    <div className="flex items-center gap-2 text-slate-500 text-sm">
      <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      {label}
    </div>
  );
};
