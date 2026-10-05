import { Outlet, useLocation } from 'react-router-dom';
import { useState, useLayoutEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A]">
      {/* ── Sidebar ── */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* ── Header ── */}
      <Header sidebarCollapsed={collapsed} />

      {/* ── Main Content ── */}
      <main
        className={`
          min-h-screen transition-all duration-300
          pt-4 pb-8 px-3 sm:px-4 md:px-6
          ${collapsed ? 'lg:ml-[80px] lg:px-6' : 'lg:ml-[280px] lg:px-8'}
        `}
        style={{ marginTop: '64px' }}
      >
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;