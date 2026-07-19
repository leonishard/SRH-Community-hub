import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/Button';
import './Login.css';

const SEED_PASSWORD = 'Password123!';

// Seeded test accounts from scripts/seed.js — only ever rendered in dev builds
// (see `import.meta.env.DEV` below), so this never ships to a real deployment.
const QUICK_LOGIN_ACCOUNTS = [
  {
    labelKey: 'groupCoordinator',
    accounts: [{ name: 'Alice Nguyen', email: 'alice.coordinator@srh.edu' }],
  },
  {
    labelKey: 'groupManagers',
    accounts: [
      { name: 'Ben Fischer', email: 'ben.fischer@stud.srh.edu' },
      { name: 'Carla Weber', email: 'carla.weber@stud.srh.edu' },
      { name: 'Diego Alvarez', email: 'diego.alvarez@stud.srh.edu' },
    ],
  },
  {
    labelKey: 'groupStudents',
    accounts: [
      { name: 'Elena Rossi', email: 'elena.rossi@stud.srh.edu' },
      { name: 'Finn Becker', email: 'finn.becker@stud.srh.edu' },
      { name: 'Grace Adeyemi', email: 'grace.adeyemi@stud.srh.edu' },
      { name: 'Hassan Ali', email: 'hassan.ali@stud.srh.edu' },
    ],
  },
];

export function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/my-circle';

  async function performLogin(loginIdentifier, loginPassword) {
    setError(null);
    setSubmitting(true);
    try {
      await login(loginIdentifier, loginPassword);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    performLogin(identifier, password);
  }

  function handleQuickLogin(account) {
    setIdentifier(account.email);
    setPassword(SEED_PASSWORD);
    performLogin(account.email, SEED_PASSWORD);
  }

  return (
    <div className="login">
      <div className="login__panel">
        <h1 className="login__title">{t.login.title}</h1>
        <form className="login__form" onSubmit={handleSubmit}>
          <label className="login__label caption" htmlFor="identifier">
            {t.login.email}
          </label>
          <input
            id="identifier"
            className="login__input"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />

          <label className="login__label caption" htmlFor="password">
            {t.login.password}
          </label>
          <input
            id="password"
            className="login__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && <div className="login__error caption">{error}</div>}

          <Button type="submit" disabled={submitting}>
            {submitting ? t.login.signingIn : t.login.signIn}
          </Button>
        </form>
      </div>

      {import.meta.env.DEV && (
        <div className="login__panel login__quick-panel">
          <h2 className="login__quick-title mono">{t.login.quickLoginTitle}</h2>
          <p className="caption" style={{ marginTop: '0.35rem' }}>
            {t.login.quickLoginDescription}
          </p>
          {QUICK_LOGIN_ACCOUNTS.map((group) => (
            <div key={group.labelKey} className="login__quick-group">
              <div className="caption login__quick-group-label">{t.login[group.labelKey].toUpperCase()}</div>
              {group.accounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="login__quick-account"
                  disabled={submitting}
                  onClick={() => handleQuickLogin(account)}
                >
                  {account.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
