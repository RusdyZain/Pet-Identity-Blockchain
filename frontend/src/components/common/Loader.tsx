// Komponen indikator loading dengan label singkat.
export const Loader = ({ label = 'Loading...' }: { label?: string }) => {
  return (
    <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm text-secondary shadow-inner shadow-primary/10">
      <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-primary to-accent animate-ping" />
      {label}
    </div>
  );
};
