import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Users, FileText, Clock, TrendingUp, Calendar, MessageCircle, DollarSign, Package, Truck, AlertCircle, Gift, Zap, Plus } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import QuickOrderModal from '../components/QuickOrderModal';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuickOrder, setShowQuickOrder] = useState(false);
  const [quickOrderContext, setQuickOrderContext] = useState({});

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

  const openQuickOrderForDate = (date) => {
    setQuickOrderContext({
      preselectedCustomer: date.customer_id,
      preselectedOccasion: date.title
    });
    setShowQuickOrder(true);
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
        <div className="bg-white rounded-xl p-4 border border-crm-border shadow-sm">
          <h2 className="font-bold text-lg text-crm-primary mb-4 flex items-center gap-2">
            📋 Today's Tasks <span className="bg-crm-primary text-white text-xs px-2 py-1 rounded-full">{totalTasks}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Orders to Dispatch */}
            {hasDispatchTasks && (
              <div className="bg-gray-50 rounded-lg p-4 border border-crm-border">
                <div className="flex items-center gap-2 text-crm-accent font-medium mb-3">
                  <Truck size={18} />
                  Ready to Dispatch ({tasks.dispatchTasks.length})
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tasks.dispatchTasks.map(task => (
                    <Link key={task.id} to={`/invoices/${task.id}`} className="block p-2 bg-white border border-gray-100 rounded hover:border-crm-accent transition-colors">
                      <p className="text-sm font-medium text-crm-primary">{task.invoice_number}</p>
                      <p className="text-xs text-crm-secondary">{task.customer_name} → {task.recipient_name || 'N/A'}</p>
                      <p className="text-xs text-crm-accent">{task.days_since}d ago</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Overdue Invoices */}
            {hasOverdueTasks && (
              <div className="bg-gray-50 rounded-lg p-4 border border-crm-border">
                <div className="flex items-center gap-2 text-crm-warning font-medium mb-3">
                  <AlertCircle size={18} />
                  Follow Up Needed ({tasks.overdueTasks.length})
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tasks.overdueTasks.map(task => (
                    <div key={task.id} className="p-2 bg-white border border-gray-100 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <Link to={`/invoices/${task.id}`} className="text-sm font-medium text-crm-primary hover:text-crm-accent">{task.invoice_number}</Link>
                          <p className="text-xs text-crm-secondary">{task.customer_name}</p>
                          <p className="text-xs text-crm-warning">{task.days_overdue}d overdue</p>
                        </div>
                        <button
                          onClick={() => openWhatsApp(task.customer_whatsapp, task.customer_name, followUpMessage(task.customer_name, task.invoice_number, task.total))}
                          className="p-1.5 text-crm-success hover:bg-green-50 rounded"
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
              <div className="bg-gray-50 rounded-lg p-4 border border-crm-border">
                <div className="flex items-center gap-2 text-crm-danger font-medium mb-3">
                  <Gift size={18} />
                  This Week's Dates ({tasks.urgentDates.length})
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tasks.urgentDates.map(date => (
                    <div key={date.id} className="p-2 bg-white border border-gray-100 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-crm-primary">{date.title}</p>
                          <p className="text-xs text-crm-secondary">{date.customer_name}</p>
                          <p className="text-xs text-crm-danger">{date.monthDay}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openQuickOrderForDate(date)}
                            className="p-1.5 text-crm-accent hover:bg-blue-50 rounded"
                            title="Quick Order"
                          >
                            <Zap size={16} />
                          </button>
                          <button
                            onClick={() => openWhatsApp(date.customer_whatsapp, date.customer_name)}
                            className="p-1.5 text-crm-success hover:bg-green-50 rounded"
                            title="WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </button>
                        </div>
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
        <div className="panel p-6 flex flex-col justify-center items-center text-center bg-white">
          <p className="text-crm-secondary text-sm mb-3">Quick Actions</p>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <button
              onClick={() => setShowQuickOrder(true)}
              className="flex-1 btn-primary text-sm flex items-center justify-center gap-2 py-2 rounded-lg"
            >
              <Zap size={16} /> Quick Order
            </button>
            <Link to="/invoices/new" className="flex-1 btn-ghost border border-crm-border text-sm flex items-center justify-center gap-2">
              <Plus size={16} /> Full Order
            </Link>
          </div>
          <Link to="/customers" className="mt-2 text-sm text-crm-accent hover:underline">
            View Customers →
          </Link>
        </div>
      </div>

      {/* Recent Invoices & Upcoming Dates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Invoices List */}
        <div className="panel p-0 overflow-hidden bg-white">
          <div className="p-4 sm:p-6 border-b border-crm-border flex justify-between items-center">
            <h2 className="font-bold text-base sm:text-lg text-crm-primary">Recent Invoices</h2>
            <Link to="/invoices" className="text-crm-accent text-xs sm:text-sm font-medium hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50 max-h-[350px] overflow-y-auto scrollbar-hide">
            {data.recentInvoices?.map(inv => (
              <Link key={inv.id} to={`/invoices/${inv.id}`} className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex-shrink-0 flex items-center justify-center ${inv.status === 'paid' ? 'bg-green-100 text-green-600' :
                    inv.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
                    }`}>
                    <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-crm-primary text-sm sm:text-base truncate">{inv.customer_name}</p>
                    <p className="text-xs text-crm-secondary truncate">{inv.invoice_number}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-bold text-crm-primary text-sm sm:text-base">Rs. {inv.total?.toLocaleString()}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide ${inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                    inv.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {inv.status}
                  </span>
                </div>
              </Link>
            ))}
            {(!data.recentInvoices || data.recentInvoices.length === 0) && (
              <p className="p-6 text-center text-crm-secondary text-sm">No recent invoices found.</p>
            )}
          </div>
        </div>

        {/* Upcoming Important Dates */}
        <div className="panel p-0 overflow-hidden bg-white">
          <div className="p-4 sm:p-6 border-b border-crm-border flex justify-between items-center">
            <h2 className="font-bold text-base sm:text-lg text-crm-primary flex items-center gap-2">
              <Calendar size={18} className="text-crm-accent" /> Upcoming Dates
            </h2>
            <Link to="/important-dates" className="text-crm-accent text-xs sm:text-sm font-medium hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50 max-h-[350px] overflow-y-auto scrollbar-hide">
            {data.upcomingDates?.map(date => (
              <div key={date.id} className="p-3 sm:p-4 flex justify-between items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-crm-primary text-sm sm:text-base truncate">{date.title}</p>
                  <p className="text-xs text-crm-secondary truncate">
                    {date.customer_name} {date.recipient_name && `→ ${date.recipient_name}`}
                  </p>
                  <p className="text-xs text-crm-accent font-medium mt-1">{date.date}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); openQuickOrderForDate(date); }}
                    className="p-2 text-crm-accent hover:bg-blue-50 active:bg-blue-100 rounded-lg touch-target"
                    title="Quick Order"
                  >
                    <Zap size={18} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openWhatsApp(date.customer_whatsapp, date.customer_name); }}
                    className="p-2 text-crm-success hover:bg-green-50 active:bg-green-100 rounded-lg touch-target"
                    title="Send WhatsApp"
                  >
                    <MessageCircle size={18} />
                  </button>
                </div>
              </div>
            ))}
            {(!data.upcomingDates || data.upcomingDates.length === 0) && (
              <p className="p-6 text-center text-crm-secondary text-sm">No upcoming dates in the next 30 days.</p>
            )}
          </div>
        </div>

      </div>

      {/* Quick Order Modal */}
      {showQuickOrder && (
        <QuickOrderModal
          onClose={() => {
            setShowQuickOrder(false);
            setQuickOrderContext({});
          }}
          preselectedCustomer={quickOrderContext.preselectedCustomer}
          preselectedOccasion={quickOrderContext.preselectedOccasion}
        />
      )}
    </div>
  );
}
