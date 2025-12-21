import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Users, FileText, Clock, TrendingUp, Calendar, MessageCircle, DollarSign, Package, Truck, AlertCircle, Gift } from 'lucide-react';
import StatsCard from '../components/StatsCard';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(res => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  const openWhatsApp = (phone, name, message) => {
    if (!phone) return;
    const encodedMsg = encodeURIComponent(message || `Hi ${name}! This is Mathaka Gift Store. We wanted to remind you about an upcoming special occasion.`);
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`, '_blank');
  };

  const followUpMessage = (name, invoiceNumber, total) => {
    return `Hi ${name}! This is Mathaka Gift Store. Just a friendly reminder about your pending invoice ${invoiceNumber} for Rs. ${total?.toLocaleString()}. Please let us know if you have any questions! 🎁`;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="spinner h-10 w-10"></div>
    </div>
  );

  const tasks = data.todaysTasks || {};
  const hasDispatchTasks = tasks.dispatchTasks?.length > 0;
  const hasOverdueTasks = tasks.overdueTasks?.length > 0;
  const hasUrgentDates = tasks.urgentDates?.length > 0;
  const totalTasks = (tasks.dispatchTasks?.length || 0) + (tasks.overdueTasks?.length || 0) + (tasks.urgentDates?.length || 0);

  return (
    <div className="space-y-6">

      {/* Today's Tasks - Priority Section */}
      {totalTasks > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
          <h2 className="font-bold text-lg text-purple-800 mb-4 flex items-center gap-2">
            📋 Today's Tasks <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">{totalTasks}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Orders to Dispatch */}
            {hasDispatchTasks && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 text-blue-600 font-medium mb-3">
                  <Truck size={18} />
                  Ready to Dispatch ({tasks.dispatchTasks.length})
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tasks.dispatchTasks.map(task => (
                    <Link key={task.id} to={`/invoices/${task.id}`} className="block p-2 bg-blue-50 rounded hover:bg-blue-100">
                      <p className="text-sm font-medium">{task.invoice_number}</p>
                      <p className="text-xs text-gray-600">{task.customer_name} → {task.recipient_name || 'N/A'}</p>
                      <p className="text-xs text-blue-600">{task.days_since}d ago</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Overdue Invoices */}
            {hasOverdueTasks && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 text-orange-600 font-medium mb-3">
                  <AlertCircle size={18} />
                  Follow Up Needed ({tasks.overdueTasks.length})
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tasks.overdueTasks.map(task => (
                    <div key={task.id} className="p-2 bg-orange-50 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <Link to={`/invoices/${task.id}`} className="text-sm font-medium text-gray-800 hover:text-purple-600">{task.invoice_number}</Link>
                          <p className="text-xs text-gray-600">{task.customer_name}</p>
                          <p className="text-xs text-orange-600">{task.days_overdue}d overdue</p>
                        </div>
                        <button
                          onClick={() => openWhatsApp(task.customer_whatsapp, task.customer_name, followUpMessage(task.customer_name, task.invoice_number, task.total))}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                        >
                          <MessageCircle size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Urgent Dates */}
            {hasUrgentDates && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 text-pink-600 font-medium mb-3">
                  <Gift size={18} />
                  This Week's Dates ({tasks.urgentDates.length})
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tasks.urgentDates.map(date => (
                    <div key={date.id} className="p-2 bg-pink-50 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{date.title}</p>
                          <p className="text-xs text-gray-600">{date.customer_name}</p>
                          <p className="text-xs text-pink-600">{date.monthDay}</p>
                        </div>
                        <button
                          onClick={() => openWhatsApp(date.customer_whatsapp, date.customer_name)}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                        >
                          <MessageCircle size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Total Customers"
          value={data.totalCustomers}
          icon={Users}
        />
        <StatsCard
          title="Total Revenue"
          value={`Rs. ${data.totalRevenue?.toLocaleString() || 0}`}
          icon={DollarSign}
          dark
        />
        <StatsCard
          title="This Month Revenue"
          value={`Rs. ${data.thisMonthRevenue?.toLocaleString() || 0}`}
          icon={TrendingUp}
        />
        <StatsCard
          title="Pending Invoices"
          value={data.pendingInvoices}
          icon={Clock}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatsCard
          title="Total Orders"
          value={data.totalInvoices}
          icon={Package}
        />
        <StatsCard
          title="Upcoming Dates"
          value={data.upcomingDates?.length || 0}
          icon={Calendar}
        />
        <div className="glass-panel p-6 flex flex-col justify-center items-center text-center">
          <p className="text-gray-500 text-sm mb-2">Quick Actions</p>
          <div className="flex gap-3">
            <Link to="/invoices/new" className="glass-button glass-button-primary text-sm">
              + New Order
            </Link>
            <Link to="/customers" className="glass-button bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">
              View Customers
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Invoices & Upcoming Dates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Invoices List */}
        <div className="glass-panel p-0 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-base sm:text-lg text-gray-800">Recent Invoices</h2>
            <Link to="/invoices" className="text-crm-purple text-xs sm:text-sm font-medium hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50 max-h-[350px] overflow-y-auto scrollbar-hide">
            {data.recentInvoices?.map(inv => (
              <Link key={inv.id} to={`/invoices/${inv.id}`} className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex-shrink-0 flex items-center justify-center ${inv.status === 'paid' ? 'bg-green-100 text-green-600' :
                    inv.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
                    }`}>
                    <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">{inv.customer_name}</p>
                    <p className="text-xs text-gray-500 truncate">{inv.invoice_number}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-bold text-gray-800 text-sm sm:text-base">Rs. {inv.total?.toLocaleString()}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide ${inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                    inv.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {inv.status}
                  </span>
                </div>
              </Link>
            ))}
            {(!data.recentInvoices || data.recentInvoices.length === 0) && (
              <p className="p-6 text-center text-gray-400 text-sm">No recent invoices found.</p>
            )}
          </div>
        </div>

        {/* Upcoming Important Dates */}
        <div className="glass-panel p-0 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-base sm:text-lg text-gray-800 flex items-center gap-2">
              <Calendar size={18} className="text-crm-purple" /> Upcoming Dates
            </h2>
            <Link to="/important-dates" className="text-crm-purple text-xs sm:text-sm font-medium hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50 max-h-[350px] overflow-y-auto scrollbar-hide">
            {data.upcomingDates?.map(date => (
              <div key={date.id} className="p-3 sm:p-4 flex justify-between items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">{date.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {date.customer_name} {date.recipient_name && `→ ${date.recipient_name}`}
                  </p>
                  <p className="text-xs text-crm-purple font-medium mt-1">{date.date}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); openWhatsApp(date.customer_whatsapp, date.customer_name); }}
                  className="p-2 text-green-600 hover:bg-green-50 active:bg-green-100 rounded-lg touch-target flex-shrink-0"
                  title="Send WhatsApp"
                >
                  <MessageCircle size={20} />
                </button>
              </div>
            ))}
            {(!data.upcomingDates || data.upcomingDates.length === 0) && (
              <p className="p-6 text-center text-gray-400 text-sm">No upcoming dates in the next 30 days.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
