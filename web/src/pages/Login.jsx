import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import './Login.css';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/my-circle';

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <div className="login__panel">
        <div className="login__brand mono">SRH AMBASSADOR HUB</div>
        <h1 className="login__title">Sign in</h1>
        <form className="login__form" onSubmit={handleSubmit}>
          <label className="login__label caption" htmlFor="identifier">
            EMAIL
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
            PASSWORD
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
            {submitting ? 'SIGNING IN…' : 'SIGN IN'}
          </Button>
        </form>
      </div>
    </div>
  );
}
