import { useState, useEffect } from 'react';
import api from '../api';
import { Activity, User } from 'lucide-react';

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/activity-log?limit=100').then(res => {
      setLogs(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getActionColor = (action) => {
    if (action.includes('created') || action.includes('added')) return 'text-green-600 bg-green-50';
    if (action.includes('deleted') || action.includes('removed')) return 'text-red-600 bg-red-50';
    if (action.includes('updated') || action.includes('changed')) return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Activity className="text-crm-primary" /> Activity Log
      </h1>

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {loading ? (
          <p className="p-4 text-center">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No activity recorded yet</p>
        ) : (
          logs.map(log => (
            <div key={log.id} className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 bg-crm-accent rounded-full flex items-center justify-center flex-shrink-0">
                <User className="text-crm-primary" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-medium">{log.user_name || 'System'}</p>
                <p className={`text-sm inline-block px-2 py-1 rounded ${getActionColor(log.action)}`}>
                  {log.action}
                </p>
                {log.entity_type && (
                  <span className="text-sm text-gray-500 ml-2">
                    on {log.entity_type} #{log.entity_id}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
