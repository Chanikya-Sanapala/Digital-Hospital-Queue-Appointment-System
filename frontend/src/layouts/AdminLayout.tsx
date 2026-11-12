import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Shield } from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', path: '/admin' },
    { label: 'Organizations', path: '/admin/organizations' },
    { label: 'Departments & Services', path: '/admin/departments' },
    { label: 'Appointments', path: '/admin/appointments' },
    { label: 'Queue Management', path: '/admin/queues' },
    { label: 'Customers', path: '/admin/customers' },
    { label: 'Analytics', path: '/admin/analytics' },
    { label: 'Settings', path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col font-sans">
      {/* Admin Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded text-[#242424] hover:bg-gray-100"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/admin" className="flex items-center space-x-2">
              <div>
                <span className="text-xl font-bold text-[#234F3E] tracking-tight">QueueSense</span>
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-[#234F3E] border border-gray-200">
                  Admin Portal
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium uppercase tracking-wider">
                {user?.role || 'Staff'}
              </span>
              <span className="text-[#242424] font-medium">{user?.first_name} {user?.last_name}</span>
            </div>
            <Link
              to="/customer"
              className="text-xs text-[#777777] hover:text-[#242424] border border-[#E5E7EB] px-2.5 py-1 rounded transition"
            >
              Patient View
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs bg-[#242424] hover:bg-gray-800 text-white px-3 py-1.5 rounded transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-60 flex-shrink-0">
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-3 shadow-xs">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#777777]">
              Management
            </div>
            <nav className="space-y-0.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  className={({ isActive }) =>
                    `block px-3.5 py-2 text-sm font-medium rounded transition ${
                      isActive
                        ? 'bg-[#234F3E] text-white'
                        : 'text-[#242424] hover:bg-gray-100 hover:text-[#234F3E]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="pt-3 border-t border-[#E5E7EB] mt-3">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3.5 py-2 text-sm text-[#777777] hover:text-red-600 hover:bg-red-50 rounded transition"
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Mobile Sidebar Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/40 flex" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-64 bg-white p-4 h-full shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#E5E7EB]">
                <span className="font-bold text-[#234F3E]">Admin Menu</span>
                <button onClick={() => setMobileMenuOpen(false)}><X size={18} /></button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `block px-3 py-2 text-sm font-medium rounded ${
                        isActive ? 'bg-[#234F3E] text-white' : 'text-[#242424] hover:bg-gray-100'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded mt-4"
                >
                  Logout
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Admin Content Area */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

