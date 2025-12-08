import { Outlet } from 'react-router-dom';

export const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-xl">
        <header className="px-6 py-4 border-b border-slate-200">
          <h1 className="text-xl font-semibold text-primary">Sistem Identitas Digital Hewan</h1>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
