import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { useState } from 'react';
import { 
  Home, Users, FileText, Receipt, Truck, Calendar, Settings, LogOut, Menu, X, Gift,
  Package, MapPin, DollarSign, BarChart3, Activity, MoreHorizontal
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
    { path: '/vendors', icon: Truck, label: 'Vendors' },
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

  // Bottom nav items for mobile (most used)
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
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors touch-target ${
          isActive 
            ? 'bg-purple-600 text-white' 
            : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
        }`}
      >
        <item.icon size={20} />
        <span>{item.label}</span>
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
          className="flex flex-col items-center justify-center gap-1 py-2 px-3 text-gray-500 active:text-purple-600"
        >
          <item.icon size={22} />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      );
    }
    
    return (
      <Link
        to={item.path}
        className={`flex flex-col items-center justify-center gap-1 py-2 px-3 transition-colors ${
          isActive 
            ? 'text-purple-600' 
            : 'text-gray-500 active:text-purple-600'
        }`}
      >
        <item.icon size={22} />
        <span className="text-[10px] font-medium">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30 pwa-header">
        <div className="flex items-center gap-2">
          <Gift className="text-purple-600" size={24} />
          <span className="font-bold text-lg">Mathaka</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-2 touch-target flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-300 ease-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b hidden lg:flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="text-purple-600" size={28} />
            <span className="font-bold text-xl">Mathaka CRM</span>
          </div>
          <NotificationBell />
        </div>
        
        {/* Mobile sidebar header */}
        <div className="p-4 border-b flex lg:hidden items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="text-purple-600" size={24} />
            <span className="font-bold text-lg">Menu</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-2 touch-target"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)] scrollbar-hide">
          {navItems.map(item => <NavLink key={item.path} item={item} />)}
          
          {user?.role === 'admin' && (
            <>
              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase">
                Admin
              </div>
              {adminItems.map(item => <NavLink key={item.path} item={item} />)}
            </>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-gray-500 hover:text-red-600 active:text-red-700 transition-colors touch-target flex items-center justify-center"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-30 pb-safe">
        <div className="flex items-center justify-around">
          {bottomNavItems.map(item => (
            <BottomNavLink key={item.path} item={item} />
          ))}
        </div>
      </nav>
    </div>
  );
}
