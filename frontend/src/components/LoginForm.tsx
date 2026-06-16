import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function LoginForm() {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError('');

    if (!email.trim()) {
      setFieldError('Email is required');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim());
    } catch {
      // error is shown via AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">📈</div>
          <h1>Stock Broker Dashboard</h1>
          <p>Enter your email to access your dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              autoFocus
              aria-describedby={fieldError || error ? 'email-error' : undefined}
            />
            {(fieldError || error) && (
              <span id="email-error" className="error-text" role="alert">
                {fieldError || error}
              </span>
            )}
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-full">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
