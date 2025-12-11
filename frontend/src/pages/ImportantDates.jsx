import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Calendar, MessageCircle, User } from 'lucide-react';

export default function ImportantDates() {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/important-dates').then(res => {
      setDates(res.data);
      setLoading(false);
    });
  }, []);

  const openWhatsApp = (phone, customerName, title) => {
    const message = encodeURIComponent(
      `Hi ${customerName}!\n\nThis is Mathaka Gift Store. We noticed ${title} is coming up soon! Would you like to send a special gift to your loved ones?\n\nLet us know how we can help! 🎁`
    );
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  // Group dates by month
  const groupedDates = dates.reduce((acc, date) => {
    const month = date.date.substring(5, 7);
    const monthName = new Date(2024, parseInt(month) - 1).toLocaleString('default', { month: 'long' });
    if (!acc[monthName]) acc[monthName] = [];
    acc[monthName].push(date);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Calendar className="text-purple-600" /> Important Dates
      </h1>
      <p className="text-gray-500">All customer important dates sorted by month. Click the WhatsApp button to send a reminder!</p>

      {loading ? (
        <p className="text-center py-8">Loading...</p>
      ) : dates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          No important dates added yet. Add them from customer profiles.
        </div>
      ) : (
        Object.entries(groupedDates).map(([month, monthDates]) => (
          <div key={month} className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b bg-gray-50 rounded-t-xl">
              <h2 className="font-semibold">{month}</h2>
            </div>
            <div className="divide-y">
              {monthDates.map(date => (
                <div key={date.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex flex-col items-center justify-center">
                      <span className="text-xs text-purple-600">{new Date(date.date + 'T00:00:00').toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-lg font-bold text-purple-700">{date.date.substring(8, 10)}</span>
                    </div>
                    <div>
                      <p className="font-medium">{date.title}</p>
                      <Link to={`/customers/${date.customer_id}`} className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                        <User size={14} /> {date.customer_name}
                        {date.recipient_name && <span className="text-gray-500">→ {date.recipient_name}</span>}
                      </Link>
                    </div>
                  </div>
                  <button
                    onClick={() => openWhatsApp(date.customer_whatsapp, date.customer_name, date.title)}
                    className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                  >
                    <MessageCircle size={18} />
                    <span className="hidden sm:inline">Send Reminder</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
