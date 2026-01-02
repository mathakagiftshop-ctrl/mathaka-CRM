import { useState } from 'react';
import { useAuth } from '../App';
import { Gift } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-crm-background flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-floating w-full max-w-md p-8 ring-1 ring-black/5">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-crm-accent rounded-2xl mb-4">
            <Gift className="text-crm-primary" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-crm-primary">Mathaka Gift Store</h1>
          <p className="text-crm-secondary mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="group">
            <label className="block text-sm font-medium text-crm-secondary mb-2 group-focus-within:text-crm-primary transition-colors">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-crm-accent outline-none transition-all"
              autoComplete="username"
              required
            />
          </div>

          <div className="group">
            <label className="block text-sm font-medium text-crm-secondary mb-2 group-focus-within:text-crm-primary transition-colors">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-crm-accent outline-none transition-all"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-crm-primary text-white py-4 rounded-xl font-bold hover:bg-gray-800 active:bg-gray-900 transition-colors disabled:opacity-50 touch-target"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
