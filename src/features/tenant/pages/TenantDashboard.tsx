/* eslint-disable @typescript-eslint/no-floating-promises */

 

/* eslint-disable jsx-a11y/anchor-is-valid */

import { useNavigate, useParams } from 'react-router';

export function TenantDashboard() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem(`tenant_${tenantCode}_token`);
    navigate(`/t/${tenantCode}/login`);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="z-10 flex w-72 flex-col border-r border-slate-200 bg-white shadow-sm">
        <div className="flex h-20 items-center border-b border-slate-100 px-8">
          <div className="flex items-center gap-3 text-cyan-600">
            <span className="text-2xl">🏥</span>
            <span className="text-xl font-bold tracking-tight text-slate-800">
              Hospital<span className="text-cyan-600">Pro</span>
            </span>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Active Tenant
            </p>
            <p className="font-mono text-sm font-bold text-cyan-700">{tenantCode}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-2">
          <div className="mt-4 mb-2 px-4 py-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
            Management
          </div>
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl bg-cyan-50 px-4 py-2.5 font-semibold text-cyan-700"
          >
            <span>📊</span> Dashboard
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <span>👨‍⚕️</span> Doctors Directory
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <span>👩‍💼</span> Receptionists
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <span>🤒</span> Patients
          </a>

          <div className="mt-8 mb-2 px-4 py-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
            System
          </div>
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <span>⚙️</span> Hospital Settings
          </a>
        </nav>

        {/* User Profile & Logout */}
        <div className="flex flex-col gap-2 border-t border-slate-100 p-4">
          <div className="mb-2 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 font-bold text-cyan-700">
              {(localStorage.getItem(`tenant_${tenantCode}_username`) || 'TA')
                .substring(0, 2)
                .toUpperCase()}
            </div>
            <div className="flex flex-col truncate">
              <span className="truncate text-sm font-bold text-slate-800">
                {localStorage.getItem(`tenant_${tenantCode}_username`) || 'Hospital Admin'}
              </span>
              <span className="truncate text-xs font-medium text-slate-500">Tenant Admin</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <span className="text-xl">🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex h-screen flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Overview</h1>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200 bg-cyan-100 text-sm font-bold text-cyan-700">
              AD
            </div>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-6xl space-y-8">
            <div className="rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 p-8 text-white shadow-lg shadow-cyan-200">
              <h2 className="mb-2 text-3xl font-bold">Welcome back, Administrator!</h2>
              <p className="max-w-2xl text-cyan-100">
                This is your dedicated hospital environment. All data managed here is completely
                physically isolated from other tenants in the master system.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="group cursor-pointer rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
                  <span>👨‍⚕️</span>
                </div>
                <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
                  Active Doctors
                </h3>
                <div className="mt-1 flex items-end gap-3">
                  <p className="text-4xl font-extrabold text-slate-800">12</p>
                  <span className="mb-1 text-sm font-semibold text-emerald-500">+2 this week</span>
                </div>
              </div>

              <div className="group cursor-pointer rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
                  <span>🤒</span>
                </div>
                <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
                  Total Patients
                </h3>
                <div className="mt-1 flex items-end gap-3">
                  <p className="text-4xl font-extrabold text-slate-800">842</p>
                  <span className="mb-1 text-sm font-semibold text-emerald-500">
                    +45 this month
                  </span>
                </div>
              </div>

              <div className="group cursor-pointer rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-transform group-hover:scale-110">
                  <span>📅</span>
                </div>
                <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
                  Today's Appointments
                </h3>
                <div className="mt-1 flex items-end gap-3">
                  <p className="text-4xl font-extrabold text-slate-800">34</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
