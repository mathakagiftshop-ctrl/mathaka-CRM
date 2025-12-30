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
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${isActive
          ? 'bg-crm-primary text-white shadow-sm'
          : 'text-crm-secondary hover:bg-gray-100 hover:text-crm-primary'
          }`}
      >
        <item.icon size={18} className={`transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-105'}`} />
        <span className="font-medium text-sm">{item.label}</span>
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
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 text-crm-secondary active:text-crm-primary"
        >
          <item.icon size={20} />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      );
    }

    return (
      <Link
        to={item.path}
        className={`flex flex-col items-center justify-center gap-1 py-1 px-3 transition-colors ${isActive
          ? 'text-crm-primary'
          : 'text-crm-secondary active:text-crm-primary'
          }`}
      >
        <item.icon size={20} className={isActive ? 'scale-110' : ''} />
        <span className="text-[10px] font-medium">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-crm-background text-crm-primary font-sans selection:bg-crm-accent/20">
      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b border-crm-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="bg-crm-primary p-2 rounded-lg text-white">
            <Gift size={20} />
          </div>
          <span className="font-bold text-lg text-crm-primary">Mathaka</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-crm-secondary">
            <NotificationBell />
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 touch-target flex items-center justify-center text-crm-secondary hover:bg-gray-100 rounded-lg"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar - Fixed Flat Panel */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-crm-border transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-crm-border">
          <div className="flex items-center gap-3">
            <div className="bg-crm-primary p-1.5 rounded-lg text-white">
              <Gift size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight text-crm-primary">Mathaka</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-auto p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] scrollbar-hide">
          {navItems.map(item => <NavLink key={item.path} item={item} />)}

          {user?.role === 'admin' && (
            <>
              <div className="mt-8 mb-2 px-4 text-[11px] font-bold text-crm-secondary uppercase tracking-wider">
                Admin Controls
              </div>
              {adminItems.map(item => <NavLink key={item.path} item={item} />)}
            </>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-crm-border bg-gray-50/50">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors">
            <div className="h-9 w-9 bg-crm-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate text-crm-primary">{user?.name}</p>
              <p className="text-xs text-crm-secondary capitalize">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pb-32 lg:pb-8 transition-all duration-300">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {/* Top Bar / Header for Desktop */}
          <header className="hidden lg:flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-crm-primary">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
              <p className="text-crm-secondary text-sm mt-1">Here's what's happening today.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white p-2 rounded-full border border-crm-border text-crm-secondary hover:text-crm-primary transition-colors cursor-pointer">
                <NotificationBell />
              </div>
            </div>
          </header>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-crm-border z-30 pb-safe">
        <div className="flex items-center justify-around translate-y-[-5px] pt-3">
          {bottomNavItems.map(item => (
            <BottomNavLink key={item.path} item={item} />
          ))}
        </div>
      </nav>
    </div>
  );
}
