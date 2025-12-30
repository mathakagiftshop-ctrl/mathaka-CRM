import { useState, useEffect } from 'react';
import { Bell, X, Calendar, MessageCircle, CheckCircle, BellRing } from 'lucide-react';
import api from '../api';

// Convert VAPID key from base64 to Uint8Array for push subscription
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    fetchUpcomingDates();
    checkNotificationPermission();
    checkPushSubscription();

    // Check every hour
    const interval = setInterval(fetchUpcomingDates, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, []);

  const fetchUpcomingDates = async () => {
    try {
      const res = await api.get('/important-dates');
      const today = new Date();

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

      // Show browser notification for today's dates (only if push not enabled)
      if (permissionGranted && !pushEnabled) {
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
      setPermissionGranted(Notification.permission === 'granted');
    }
  };

  const checkPushSubscription = async () => {
    try {
      // Check if service worker and push are supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setPushEnabled(!!subscription);
    } catch (err) {
      console.error('Error checking push subscription:', err);
    }
  };

  const enablePushNotifications = async () => {
    setPushLoading(true);
    try {
      // First request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Please allow notifications to enable push reminders');
        setPushLoading(false);
        return;
      }
      setPermissionGranted(true);

      // Get VAPID public key from server
      const { data: vapidData } = await api.get('/push/vapid-public-key');
      if (!vapidData.publicKey) {
        alert('Push notifications are not configured on the server');
        setPushLoading(false);
        return;
      }

      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.register('/sw-push.js');
      await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey)
      });

      // Send subscription to server
      await api.post('/push/subscribe', subscription.toJSON());

      setPushEnabled(true);

      // Show confirmation
      new Notification('🔔 Push Notifications Enabled', {
        body: 'You\'ll now receive reminders even when the app is closed!',
        icon: '/icon.svg'
      });
    } catch (err) {
      console.error('Failed to enable push:', err);
      alert('Failed to enable push notifications. Please try again.');
    }
    setPushLoading(false);
  };

  const disablePushNotifications = async () => {
    setPushLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe locally
        await subscription.unsubscribe();

        // Remove from server
        await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
      }

      setPushEnabled(false);
    } catch (err) {
      console.error('Failed to disable push:', err);
    }
    setPushLoading(false);
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
    if (date.customer_whatsapp) {
      const message = encodeURIComponent(`Hi! Just a reminder about the upcoming ${date.title}. Would you like to send a gift? 🎁`);
      window.open(`https://wa.me/${date.customer_whatsapp.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
    }
  };

  const todayCount = notifications.filter(n => n.daysUntil === 0).length;
  const upcomingCount = notifications.length;
  const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-crm-secondary hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={22} />
        {upcomingCount > 0 && (
          <span className={`absolute -top-1 -right-1 w-5 h-5 ${todayCount > 0 ? 'bg-crm-danger' : 'bg-crm-accent'} text-white text-xs rounded-full flex items-center justify-center`}>
            {upcomingCount}
          </span>
        )}
      </button>

      {showPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
          <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border z-50 max-h-[28rem] overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between bg-purple-50">
              <h3 className="font-semibold text-purple-900">Upcoming Dates</h3>
              <button onClick={() => setShowPanel(false)} className="text-gray-500">
                <X size={18} />
              </button>
            </div>

            {/* Push Notification Toggle */}
            {isPushSupported && (
              <div className={`p-3 border-b ${pushEnabled ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {pushEnabled ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <BellRing size={16} className="text-yellow-600" />
                    )}
                    <span className={`text-xs font-medium ${pushEnabled ? 'text-green-800' : 'text-yellow-800'}`}>
                      {pushEnabled ? 'Push notifications active' : 'Get reminders when app is closed'}
                    </span>
                  </div>
                  <button
                    onClick={pushEnabled ? disablePushNotifications : enablePushNotifications}
                    disabled={pushLoading}
                    className={`text-xs px-3 py-1 rounded-lg transition-colors ${pushEnabled
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-yellow-600 text-white hover:bg-yellow-700'
                      } disabled:opacity-50`}
                  >
                    {pushLoading ? '...' : pushEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            )}

            {/* Legacy browser notification prompt (fallback for browsers without Push API) */}
            {!isPushSupported && !permissionGranted && 'Notification' in window && (
              <div className="p-3 bg-yellow-50 border-b">
                <p className="text-xs text-yellow-800 mb-2">Enable notifications to get reminders</p>
                <button
                  onClick={async () => {
                    const permission = await Notification.requestPermission();
                    setPermissionGranted(permission === 'granted');
                  }}
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
