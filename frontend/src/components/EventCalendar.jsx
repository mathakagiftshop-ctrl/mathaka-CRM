import { useState } from 'react';
import Calendar from 'react-calendar';
import { X, MessageCircle, User, Gift, Calendar as CalendarIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EventCalendar({ dates, onSendReminder }) {
    const [selectedDate, setSelectedDate] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Get events for a specific date
    const getEventsForDate = (date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const monthDay = `${month}-${day}`;

        return dates.filter(d => d.date.substring(5) === monthDay);
    };

    // Check if a date has events
    const hasEvents = (date) => {
        return getEventsForDate(date).length > 0;
    };

    // Handle date click
    const handleDateClick = (date) => {
        const events = getEventsForDate(date);
        if (events.length > 0) {
            setSelectedDate({ date, events });
            setShowModal(true);
        }
    };

    // Custom tile content to show dots for dates with events
    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const events = getEventsForDate(date);
            if (events.length > 0) {
                return (
                    <div className="flex justify-center gap-0.5 mt-1">
                        {events.slice(0, 3).map((event, i) => (
                            <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${event.title.toLowerCase().includes('birthday') ? 'bg-pink-500' :
                                        event.title.toLowerCase().includes('anniversary') ? 'bg-red-500' :
                                            'bg-purple-500'
                                    }`}
                            />
                        ))}
                        {events.length > 3 && (
                            <span className="text-[8px] text-gray-500">+{events.length - 3}</span>
                        )}
                    </div>
                );
            }
        }
        return null;
    };

    // Custom class for dates with events
    const tileClassName = ({ date, view }) => {
        if (view === 'month' && hasEvents(date)) {
            return 'has-event';
        }
        return null;
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm p-4">
                <Calendar
                    onChange={handleDateClick}
                    tileContent={tileContent}
                    tileClassName={tileClassName}
                    className="mathaka-calendar"
                    locale="en-US"
                    minDetail="month"
                />
            </div>

            {/* Event Details Modal */}
            {showModal && selectedDate && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowModal(false)} />
                    <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-white rounded-2xl shadow-xl z-50 overflow-hidden">
                        <div className="p-4 border-b bg-purple-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="text-purple-600" size={20} />
                                <h3 className="font-semibold text-purple-900">
                                    {selectedDate.date.toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="max-h-80 overflow-y-auto divide-y">
                            {selectedDate.events.map((event) => (
                                <div key={event.id} className="p-4 hover:bg-gray-50">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">
                                                    {event.title.toLowerCase().includes('birthday') ? '🎂' :
                                                        event.title.toLowerCase().includes('anniversary') ? '💍' : '📅'}
                                                </span>
                                                <h4 className="font-medium">{event.title}</h4>
                                            </div>

                                            <Link
                                                to={`/customers/${event.customer_id}`}
                                                className="text-sm text-purple-600 hover:underline flex items-center gap-1 mt-1"
                                                onClick={() => setShowModal(false)}
                                            >
                                                <User size={14} />
                                                {event.customer_name}
                                                {event.recipient_name && (
                                                    <span className="text-gray-500">→ {event.recipient_name}</span>
                                                )}
                                            </Link>

                                            {event.notes && (
                                                <p className="text-xs text-gray-500 mt-1">{event.notes}</p>
                                            )}
                                        </div>

                                        {event.customer_whatsapp && (
                                            <button
                                                onClick={() => {
                                                    onSendReminder?.(event);
                                                    setShowModal(false);
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm"
                                            >
                                                <MessageCircle size={16} />
                                                <span>Remind</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <style>{`
        .mathaka-calendar {
          width: 100%;
          border: none;
          font-family: inherit;
        }
        
        .mathaka-calendar .react-calendar__navigation {
          display: flex;
          margin-bottom: 1rem;
        }
        
        .mathaka-calendar .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-weight: 600;
          font-size: 1rem;
          padding: 0.5rem;
          border-radius: 0.5rem;
        }
        
        .mathaka-calendar .react-calendar__navigation button:hover {
          background: #f3f4f6;
        }
        
        .mathaka-calendar .react-calendar__navigation button:disabled {
          background-color: transparent;
        }
        
        .mathaka-calendar .react-calendar__month-view__weekdays {
          text-align: center;
          font-weight: 600;
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
        }
        
        .mathaka-calendar .react-calendar__month-view__weekdays abbr {
          text-decoration: none;
        }
        
        .mathaka-calendar .react-calendar__tile {
          padding: 0.75rem 0.5rem;
          background: none;
          text-align: center;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          position: relative;
        }
        
        .mathaka-calendar .react-calendar__tile:hover {
          background: #f3f4f6;
        }
        
        .mathaka-calendar .react-calendar__tile--now {
          background: #ede9fe;
          color: #7c3aed;
          font-weight: 600;
        }
        
        .mathaka-calendar .react-calendar__tile--now:hover {
          background: #ddd6fe;
        }
        
        .mathaka-calendar .react-calendar__tile--active {
          background: #9333ea;
          color: white;
        }
        
        .mathaka-calendar .react-calendar__tile--active:hover {
          background: #7e22ce;
        }
        
        .mathaka-calendar .react-calendar__tile.has-event {
          font-weight: 600;
        }
        
        .mathaka-calendar .react-calendar__tile--neighboringMonth {
          color: #d1d5db;
        }
      `}</style>
        </>
    );
}
