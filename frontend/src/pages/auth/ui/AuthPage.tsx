import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BarChart3, Eye, EyeOff, History, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { GlowingCard } from '@/shared/ui/GlowingCard';
import { BrandLogo } from '@/shared/ui/BrandLogo';

const DEMO_ACCOUNTS = [
  {
    role: 'Admin',
    email: 'admin@sys.com',
    password: 'admin',
    note: 'Backups, audits and moderation tools',
  },
  {
    role: 'Operator',
    email: 'operator@sys.com',
    password: 'operator',
    note: 'Schedule flow and prediction ops',
  },
  {
    role: 'User',
    email: 'user@sys.com',
    password: 'user',
    note: 'History, saved runs and scouting views',
  },
];

const ACCESS_FEATURES = [
  {
    icon: History,
    title: 'Persistent prediction history',
    description: 'Each run stays attached to the active account and appears in the private history feed.',
  },
  {
    icon: BarChart3,
    title: 'Role-based workspace access',
    description: 'Admin, operator and user sessions unlock different parts of the platform cleanly.',
  },
  {
    icon: ShieldCheck,
    title: 'Live backend auth',
    description: 'The screen talks to the real Node API and Postgres session flow, not a mocked frontend form.',
  },
];

export function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const applyDemoAccount = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setIsLogin(true);
    setIdentifier(account.email);
    setPassword(account.password);
    setEmail('');
    setName('');
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const success = await login(identifier, password);
        if (!success) {
          setError('Invalid credentials. Try one of the demo accounts below.');
          return;
        }
      } else {
        const success = await register({ email, password, name });
        if (!success) {
          setError('Registration could not be completed.');
          return;
        }
      }

      navigate('/');
    } catch (submissionError: any) {
      setError(submissionError.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <GlowingCard glowColor="blue" className="p-8 md:p-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="data-chip">Access layer</span>
          <span className="data-chip">Node API + Postgres</span>
        </div>

        <div className="mt-6 space-y-5">
          <BrandLogo size="lg" />
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent-soft)]">Secure workspace access</p>
            <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight text-white">
              Sign in with cleaner access and real workspace context.
            </h1>
          </div>
        </div>

        <p className="mt-6 text-base leading-7 text-slate-300">
          Authentication runs against the live backend, so sessions, prediction history and admin actions persist in
          the real app state.
        </p>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {ACCESS_FEATURES.map((feature) => (
            <div key={feature.title} className="surface-muted">
              <feature.icon className="h-5 w-5 text-slate-200" />
              <p className="mt-3 text-base font-semibold text-white">{feature.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Demo accounts</p>
              <p className="mt-2 text-sm text-slate-400">Click any card to fill the form instantly.</p>
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">3 ready profiles</p>
          </div>

          <div className="mt-4 space-y-3">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => applyDemoAccount(account)}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:border-white/16 hover:bg-white/[0.05]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="status-pill">{account.role}</span>
                    <span className="text-sm text-slate-500">{account.email}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{account.note}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">Use demo</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{account.password}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </GlowingCard>

      <GlowingCard glowColor="orange" className="p-8 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[rgba(236,216,171,0.72)]">Workspace gate</p>
            <h2 className="mt-2 font-spacegrotesk text-4xl font-bold text-white">
              {isLogin ? 'Sign in and continue' : 'Create an account'}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
              {isLogin
                ? 'Use email or a short demo alias like admin, operator or user.'
                : 'Registration creates a real user in the backend and starts a live session immediately.'}
            </p>
          </div>

          <div className="segmented-bar">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
              className={`segmented-item ${isLogin ? 'segmented-item-active' : ''}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
              className={`segmented-item ${!isLogin ? 'segmented-item-active' : ''}`}
            >
              Register
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <AnimatePresence initial={false}>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="text-sm font-medium text-slate-300">Full name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required={!isLogin}
                  autoComplete="name"
                  placeholder="Alexey Analyst"
                  className="field-shell px-4 py-3"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">{isLogin ? 'Email or login' : 'Email'}</label>
            <input
              type={isLogin ? 'text' : 'email'}
              value={isLogin ? identifier : email}
              onChange={(event) => (isLogin ? setIdentifier(event.target.value) : setEmail(event.target.value))}
              required
              autoComplete={isLogin ? 'username' : 'email'}
              placeholder={isLogin ? 'admin@sys.com or admin' : 'alex@example.com'}
              className="field-shell px-4 py-3"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                placeholder={isLogin ? 'Enter your password' : 'Create a secure password'}
                className="field-shell py-3 pl-4 pr-14"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Processing...' : isLogin ? 'Enter workspace' : 'Create and continue'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-4 text-sm leading-6 text-slate-400">
            {isLogin
              ? 'Demo aliases work here too: enter admin, operator or user instead of the full email.'
              : 'New accounts are created with the standard user role and can start saving predictions immediately.'}
          </div>
        </form>
      </GlowingCard>
    </div>
  );
}

export default AuthPage;
