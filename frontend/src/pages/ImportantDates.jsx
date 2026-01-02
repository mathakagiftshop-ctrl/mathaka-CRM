import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Calendar, MessageCircle, User, List, Grid, Plus } from 'lucide-react';
import EventCalendar from '../components/EventCalendar';

export default function ImportantDates() {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'

  useEffect(() => {
    fetchDates();
  }, []);

  const fetchDates = async () => {
    try {
      const res = await api.get('/important-dates');
      setDates(res.data);
    } catch (err) {
      console.error('Failed to fetch dates');
    }
    setLoading(false);
  };

  const openWhatsApp = (phone, customerName, title) => {
    const message = encodeURIComponent(
      `Hi ${customerName}!\n\nThis is Mathaka Gift Store. We noticed ${title} is coming up soon! Would you like to send a special gift to your loved ones?\n\nLet us know how we can help! 🎁`
    );
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  const handleSendReminder = (date) => {
    if (date.customer_whatsapp) {
      openWhatsApp(date.customer_whatsapp, date.customer_name, date.title);
    }
  };

  // Get upcoming dates count
  const getUpcomingCount = () => {
    const today = new Date();
    return dates.filter(d => {
      const dateMonthDay = d.date.substring(5);
      const [month, day] = dateMonthDay.split('-').map(Number);
      let targetDate = new Date(today.getFullYear(), month - 1, day);
      if (targetDate < today) {
        targetDate = new Date(today.getFullYear() + 1, month - 1, day);
      }
      const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }).length;
  };

  // Group dates by month for list view
  const groupedDates = dates.reduce((acc, date) => {
    const month = date.date.substring(5, 7);
    const monthName = new Date(2024, parseInt(month) - 1).toLocaleString('default', { month: 'long' });
    if (!acc[monthName]) acc[monthName] = [];
    acc[monthName].push(date);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-crm-primary" />
            Important Dates
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {dates.length} dates tracked • {getUpcomingCount()} within 30 days
          </p>
        </div>

        {/* View Toggle & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-white shadow text-crm-primary' : 'text-gray-500 hover:text-gray-700'}`}
              title="Calendar view"
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow text-crm-primary' : 'text-gray-500 hover:text-gray-700'}`}
              title="List view"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner w-8 h-8"></div>
        </div>
      ) : dates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="font-medium text-gray-600 mb-1">No important dates yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Add birthdays, anniversaries, and other dates from customer profiles
          </p>
          <Link
            to="/customers"
            className="inline-flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-gray-800 font-medium"
          >
            <Plus size={18} />
            Go to Customers
          </Link>
        </div>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <EventCalendar dates={dates} onSendReminder={handleSendReminder} />
      ) : (
        /* List View */
        <div className="space-y-4">
          {Object.entries(groupedDates).map(([month, monthDates]) => (
            <div key={month} className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b bg-gray-50 rounded-t-xl flex items-center justify-between">
                <h2 className="font-semibold">{month}</h2>
                <span className="text-sm text-gray-500">{monthDates.length} dates</span>
              </div>
              <div className="divide-y">
                {monthDates.map(date => (
                  <div key={date.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-crm-accent rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-xs text-crm-primary">
                          {new Date(date.date + 'T00:00:00').toLocaleString('default', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-crm-primary">
                          {date.date.substring(8, 10)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{date.title}</p>
                        <Link
                          to={`/customers/${date.customer_id}`}
                          className="text-sm text-crm-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <User size={14} />
                          <span className="truncate">{date.customer_name}</span>
                          {date.recipient_name && (
                            <span className="text-gray-500">→ {date.recipient_name}</span>
                          )}
                        </Link>
                      </div>
                    </div>
                    <button
                      onClick={() => openWhatsApp(date.customer_whatsapp, date.customer_name, date.title)}
                      className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 flex-shrink-0"
                    >
                      <MessageCircle size={18} />
                      <span className="hidden sm:inline">Remind</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend (shown only in calendar view) */}
      {viewMode === 'calendar' && dates.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Legend</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-pink-500"></div>
              <span className="text-gray-600">Birthday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600">Anniversary</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-crm-accent"></div>
              <span className="text-gray-600">Other</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
