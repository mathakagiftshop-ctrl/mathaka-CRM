import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { useState } from 'react';
import {
  Home, Users, FileText, Receipt, Truck, Calendar, Settings, LogOut, Menu, X, Gift,
  Package, MapPin, DollarSign, BarChart3, Activity, MoreHorizontal, Sparkles
} from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/customers', icon: Users, label: 'Customers' },
    { path: '/invoices', icon: FileText, label: 'Orders' },
    { path: '/receipts', icon: Receipt, label: 'Receipts' },
    { path: '/products', icon: Package, label: 'Products' },
    { path: '/package-assistant', icon: Sparkles, label: 'AI Assistant' },
    { path: '/vendors', icon: Truck, label: 'Vendors' },
    { path: '/vendor-orders', icon: Gift, label: 'Vendor Orders' },
    { path: '/expenses', icon: DollarSign, label: 'Expenses' },
    { path: '/important-dates', icon: Calendar, label: 'Important Dates' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
  ];

  const adminItems = [
    { path: '/delivery-zones', icon: MapPin, label: 'Delivery Zones' },
    { path: '/activity-log', icon: Activity, label: 'Activity Log' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/users', icon: Users, label: 'Users' },
  ];

  // Bottom nav items for mobile
  const bottomNavItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/customers', icon: Users, label: 'Customers' },
    { path: '/invoices', icon: FileText, label: 'Orders' },
    { path: '/receipts', icon: Receipt, label: 'Receipts' },
    { path: '#more', icon: MoreHorizontal, label: 'More' },
  ];

  const NavLink = ({ item }) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 touch-target group ${isActive
          ? 'bg-crm-purple text-white shadow-glow-purple'
          : 'text-gray-500 hover:bg-white hover:text-crm-purple'
          }`}
      >
        <item.icon size={20} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
        <span className="font-medium">{item.label}</span>
      </Link>
    );
  };

  const BottomNavLink = ({ item }) => {
    const isActive = location.pathname === item.path;
    const isMore = item.path === '#more';

    if (isMore) {
      return (
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-2 px-3 text-gray-500 active:text-crm-purple"
        >
          <item.icon size={22} />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      );
    }

    return (
      <Link
        to={item.path}
        className={`flex flex-col items-center justify-center gap-1 py-2 px-3 transition-colors ${isActive
          ? 'text-crm-purple'
          : 'text-gray-500 active:text-crm-purple'
          }`}
      >
        <item.icon size={22} className={isActive ? 'animate-bounce' : ''} />
        <span className="text-[10px] font-medium">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-crm-background text-gray-800 font-sans">
      {/* Mobile header */}
      <div className="lg:hidden glass-panel m-4 mb-0 px-4 py-3 flex items-center justify-between sticky top-4 z-30">
        <div className="flex items-center gap-2">
          <div className="bg-crm-purple p-2 rounded-lg text-white">
            <Gift size={20} />
          </div>
          <span className="font-bold text-lg text-gray-800">Mathaka</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 touch-target flex items-center justify-center text-gray-600"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar - Floating Glass Panel */}
      <aside className={`
        fixed inset-y-4 left-4 z-50 w-64 glass-panel transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-[200%]'}
      `}>
        <div className="p-6 border-b border-gray-100/50 hidden lg:flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-crm-purple p-2 rounded-xl text-white shadow-glow-purple">
              <Gift size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight">Mathaka</span>
          </div>
        </div>

        {/* Mobile sidebar header */}
        <div className="p-4 border-b border-gray-100 flex lg:hidden items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-crm-purple p-2 rounded-lg text-white">
              <Gift size={20} />
            </div>
            <span className="font-bold text-lg">Mathaka CRM</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 touch-target bg-gray-50 rounded-full"
            aria-label="Close menu"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] scrollbar-hide pb-20">
          {navItems.map(item => <NavLink key={item.path} item={item} />)}

          {user?.role === 'admin' && (
            <>
              <div className="pt-6 pb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Admin Controls
              </div>
              {adminItems.map(item => <NavLink key={item.path} item={item} />)}
            </>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100/50 bg-white/50 backdrop-blur-sm rounded-b-3xl">
          <div className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-gray-100">
            <div className="min-w-0 flex-1 pl-2">
              <p className="font-bold text-sm truncate text-gray-800">{user?.name}</p>
              <p className="text-xs text-crm-purple font-medium capitalize">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors touch-target flex items-center justify-center rounded-lg hover:bg-red-50"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-[288px] min-h-screen pb-32 lg:pb-0 transition-all duration-300">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {/* Top Bar / Header for Desktop - Hidden on Mobile */}
          <header className="hidden lg:flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
              <p className="text-gray-500 text-sm">Here's what's happening closely.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white p-2 rounded-full shadow-sm">
                <NotificationBell />
              </div>
              <div className="h-10 w-10 bg-gradient-to-tr from-crm-purple to-crm-highlight rounded-full overflow-hidden p-[2px]">
                <div className="bg-white h-full w-full rounded-full flex items-center justify-center">
                  <span className="font-bold text-crm-purple">{user?.name?.[0]}</span>
                </div>
              </div>
            </div>
          </header>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-panel rounded-b-none border-t border-white/20 z-30 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around translate-y-[-5px]">
          {bottomNavItems.map(item => (
            <BottomNavLink key={item.path} item={item} />
          ))}
        </div>
      </nav>
    </div>
  );
}
