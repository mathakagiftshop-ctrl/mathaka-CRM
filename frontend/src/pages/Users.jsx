import { useState, useEffect } from 'react';
import api from '../api';
import { Plus, User, Trash2, Shield, UserCircle } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'staff' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = () => {
    api.get('/auth/users').then(res => {
      setUsers(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/users', form);
      setShowModal(false);
      setForm({ username: '', password: '', name: '', role: 'staff' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating user');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this user?')) {
      try {
        await api.delete(`/auth/users/${id}`);
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.error || 'Error deleting user');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Users</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          <Plus size={20} /> Add User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {loading ? (
          <p className="p-4 text-center">Loading...</p>
        ) : (
          users.map(user => (
            <div key={user.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                  {user.role === 'admin' ? <Shield className="text-purple-600" size={20} /> : <UserCircle className="text-gray-600" size={20} />}
                </div>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-500">@{user.username} • <span className="capitalize">{user.role}</span></p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(user.id)}
                className="p-2 text-gray-500 hover:text-red-600 rounded-lg"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add User</h2>
            {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg">Add User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
