import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Users, FileText, Clock, TrendingUp, Calendar, MessageCircle } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(res => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  const openWhatsApp = (phone, name) => {
    const message = encodeURIComponent(`Hi ${name}! This is Mathaka Gift Store. We wanted to remind you about an upcoming special occasion. Would you like to send a gift to your loved ones?`);
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  const stats = [
    { label: 'Total Customers', value: data.totalCustomers, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Invoices', value: data.totalInvoices, icon: FileText, color: 'bg-green-500' },
    { label: 'Pending Invoices', value: data.pendingInvoices, icon: Clock, color: 'bg-yellow-500' },
    { label: 'This Month Revenue', value: `Rs. ${data.thisMonthRevenue.toLocaleString()}`, icon: TrendingUp, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-3 sm:p-4 shadow-sm card-touch">
            <div className={`inline-flex p-2 rounded-lg ${stat.color} text-white mb-2`}>
              <stat.icon size={18} className="sm:w-5 sm:h-5" />
            </div>
            <p className="text-lg sm:text-2xl font-bold truncate">{stat.value}</p>
            <p className="text-xs sm:text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-3 sm:p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-sm sm:text-base">Recent Invoices</h2>
            <Link to="/invoices" className="text-purple-600 text-xs sm:text-sm">View all</Link>
          </div>
          <div className="divide-y">
            {data.recentInvoices.map(inv => (
              <Link key={inv.id} to={`/invoices/${inv.id}`} className="p-3 sm:p-4 flex justify-between items-center hover:bg-gray-50 active:bg-gray-100">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="font-medium text-sm sm:text-base truncate">{inv.invoice_number}</p>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">{inv.customer_name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-medium text-sm sm:text-base">Rs. {inv.total.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    inv.status === 'paid' ? 'bg-green-100 text-green-700' : 
                    inv.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              </Link>
            ))}
            {data.recentInvoices.length === 0 && (
              <p className="p-4 text-gray-500 text-center text-sm">No invoices yet</p>
            )}
          </div>
        </div>

        {/* Upcoming Important Dates */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-3 sm:p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-sm sm:text-base flex items-center gap-2">
              <Calendar size={16} className="sm:w-[18px] sm:h-[18px]" /> Upcoming Dates
            </h2>
            <Link to="/important-dates" className="text-purple-600 text-xs sm:text-sm">View all</Link>
          </div>
          <div className="divide-y">
            {data.upcomingDates.map(date => (
              <div key={date.id} className="p-3 sm:p-4 flex justify-between items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base truncate">{date.title}</p>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    {date.customer_name} {date.recipient_name && `→ ${date.recipient_name}`}
                  </p>
                  <p className="text-xs text-purple-600">{date.date}</p>
                </div>
                <button
                  onClick={() => openWhatsApp(date.customer_whatsapp, date.customer_name)}
                  className="p-2 text-green-600 hover:bg-green-50 active:bg-green-100 rounded-lg touch-target flex-shrink-0"
                  title="Send WhatsApp"
                >
                  <MessageCircle size={20} />
                </button>
              </div>
            ))}
            {data.upcomingDates.length === 0 && (
              <p className="p-4 text-gray-500 text-center text-sm">No upcoming dates</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
