import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { usePactumStore } from '../store/usePactumStore';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [error, setError] = useState('');

  const login = usePactumStore((s) => s.login);
  const register = usePactumStore((s) => s.register);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await register({ email: form.email, username: form.username, password: form.password });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="mvp-card w-full max-w-md p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Pactum</h1>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setMode('login')}
            className={`rounded-lg py-2 text-sm font-semibold ${mode === 'login' ? 'bg-white shadow-sm' : 'text-slate-600'}`}
          >
            Login
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`rounded-lg py-2 text-sm font-semibold ${mode === 'signup' ? 'bg-white shadow-sm' : 'text-slate-600'}`}
          >
            Sign Up
          </button>
        </div>

        <form className="space-y-3" onSubmit={submit}>
          <label className="block text-sm font-medium text-slate-700">
            Email or Username
            <input
              className="mvp-input mt-1"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          {mode === 'signup' ? (
            <label className="block text-sm font-medium text-slate-700">
              Username
              <input
                className="mvp-input mt-1"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </label>
          ) : null}
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              className="mvp-input mt-1"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          {error ? <p className="text-sm font-medium text-rose-600">Unable to continue. Check your details and try again.</p> : null}
          <button className="mvp-btn-primary w-full">{mode === 'login' ? 'Login' : 'Create Account'}</button>
        </form>
      </div>
    </div>
  );
}
