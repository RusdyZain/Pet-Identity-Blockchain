import { Outlet } from 'react-router-dom';

export const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-mist via-white to-sky-50 px-4 py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-8 rounded-3xl bg-white/60 p-8 shadow-[0_35px_60px_-35px_rgba(5,46,31,0.3)] backdrop-blur-md md:grid-cols-2">
        <div className="order-2 flex flex-col justify-center rounded-2xl bg-white p-8 shadow-inner md:order-1">
          <header className="mb-6">
            <p className="text-sm uppercase tracking-[0.2em] text-primary/70">Pet Identity Suite</p>
            <h1 className="text-3xl font-bold text-secondary">Portal Dokter Hewan & Pemilik</h1>
            <p className="mt-2 text-sm text-slate-500">
              Verifikasi identitas, histori vaksin, dan perawatan hewan dengan standar klinik profesional.
            </p>
          </header>
          <Outlet />
        </div>
        <div className="order-1 flex flex-col justify-between rounded-2xl bg-gradient-to-br from-primary to-emerald-500 p-8 text-white md:order-2">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-white/70">Trusted by Clinics</p>
            <h2 className="mt-3 text-3xl font-semibold">Dashboard veterinari dengan insight real-time.</h2>
            <p className="mt-4 text-white/90">
              Pemilik, klinik, dan admin bisa berkolaborasi memastikan vaksinasi tercatat aman di jaringan blockchain.
            </p>
          </div>
          <div className="mt-8 grid gap-6 text-sm">
            {[
              'Audit trail vaksin otomatis & terenkripsi',
              'Monitoring koreksi data & transfer kepemilikan',
              'Portal trace publik untuk edukasi komunitas',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-white" />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
