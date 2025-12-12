import { useState, useEffect } from 'react';
import { Bell, X, Calendar, MessageCircle } from 'lucide-react';
import api from '../api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    fetchUpcomingDates();
    checkNotificationPermission();
    
    // Check daily
    const interval = setInterval(fetchUpcomingDates, 1000 * 60 * 60); // Every hour
    return () => clearInterval(interval);
  }, []);

  const fetchUpcomingDates = async () => {
    try {
      const res = await api.get('/important-dates');
      const today = new Date();
      const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Get dates in next 7 days
      const upcoming = (res.data || []).filter(d => {
        const dateMonthDay = d.date.substring(5);
        const daysUntil = getDaysUntil(dateMonthDay);
        return daysUntil >= 0 && daysUntil <= 7;
      }).map(d => ({
        ...d,
        daysUntil: getDaysUntil(d.date.substring(5))
      })).sort((a, b) => a.daysUntil - b.daysUntil);

      setNotifications(upcoming);

      // Show browser notification for today's dates
      if (permissionGranted) {
        const todayDates = upcoming.filter(d => d.daysUntil === 0);
        todayDates.forEach(d => {
          showBrowserNotification(d);
        });
      }
    } catch (err) {
      console.error('Failed to fetch dates');
    }
  };

  const getDaysUntil = (monthDay) => {
    const today = new Date();
    const [month, day] = monthDay.split('-').map(Number);
    let targetDate = new Date(today.getFullYear(), month - 1, day);
    
    // If date has passed this year, check next year
    if (targetDate < today) {
      targetDate = new Date(today.getFullYear() + 1, month - 1, day);
    }
    
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setPermissionGranted(true);
      }
    }
  };

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPermissionGranted(true);
        new Notification('Mathaka CRM', {
          body: 'Notifications enabled! You\'ll be reminded of important dates.',
          icon: '/icon.svg'
        });
      }
    }
  };

  const showBrowserNotification = (date) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`🎂 ${date.title}`, {
        body: `Today! ${date.customer_name}${date.recipient_name ? ` - ${date.recipient_name}` : ''}`,
        icon: '/icon.svg',
        tag: `date-${date.id}`
      });
    }
  };

  const sendWhatsAppReminder = (date) => {
    const message = encodeURIComponent(
      `🎁 Reminder: ${date.title}\n` +
      `Customer: ${date.customer_name}\n` +
      `${date.recipient_name ? `Recipient: ${date.recipient_name}\n` : ''}` +
      `Date: ${new Date(date.date).toLocaleDateString()}\n\n` +
      `Don't forget to reach out!`
    );
    // Send to the customer's WhatsApp
    if (date.customer_whatsapp) {
      window.open(`https://wa.me/${date.customer_whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi! Just a reminder about the upcoming ${date.title}. Would you like to send a gift? 🎁`)}`, '_blank');
    }
  };

  const todayCount = notifications.filter(n => n.daysUntil === 0).length;
  const upcomingCount = notifications.length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
      >
        <Bell size={22} />
        {upcomingCount > 0 && (
          <span className={`absolute -top-1 -right-1 w-5 h-5 ${todayCount > 0 ? 'bg-red-500' : 'bg-purple-500'} text-white text-xs rounded-full flex items-center justify-center`}>
            {upcomingCount}
          </span>
        )}
      </button>

      {showPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
          <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border z-50 max-h-96 overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between bg-purple-50">
              <h3 className="font-semibold text-purple-900">Upcoming Dates</h3>
              <button onClick={() => setShowPanel(false)} className="text-gray-500">
                <X size={18} />
              </button>
            </div>

            {!permissionGranted && 'Notification' in window && (
              <div className="p-3 bg-yellow-50 border-b">
                <p className="text-xs text-yellow-800 mb-2">Enable notifications to get reminders</p>
                <button
                  onClick={requestPermission}
                  className="text-xs bg-yellow-600 text-white px-3 py-1 rounded-lg"
                >
                  Enable Notifications
                </button>
              </div>
            )}

            <div className="overflow-y-auto max-h-64">
              {notifications.length === 0 ? (
                <p className="p-4 text-center text-gray-500 text-sm">No upcoming dates in the next 7 days</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`p-3 border-b hover:bg-gray-50 ${n.daysUntil === 0 ? 'bg-red-50' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className={n.daysUntil === 0 ? 'text-red-500' : 'text-purple-500'} />
                          <span className="font-medium text-sm">{n.title}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {n.customer_name}
                          {n.recipient_name && ` → ${n.recipient_name}`}
                        </p>
                        <p className={`text-xs mt-1 ${n.daysUntil === 0 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          {n.daysUntil === 0 ? '🎉 TODAY!' : n.daysUntil === 1 ? 'Tomorrow' : `In ${n.daysUntil} days`}
                        </p>
                      </div>
                      {n.customer_whatsapp && (
                        <button
                          onClick={() => sendWhatsAppReminder(n)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Send WhatsApp reminder"
                        >
                          <MessageCircle size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
