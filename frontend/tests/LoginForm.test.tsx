import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { LoginForm } from '../src/components/LoginForm';
import { AuthProvider } from '../src/context/AuthContext';

// Mock the api module
vi.mock('../src/services/api', () => ({
  api: {
    login: vi.fn(),
  },
}));

import { api } from '../src/services/api';

function renderLogin() {
  return render(
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('LoginForm', () => {
  it('renders email input and submit button', () => {
    renderLogin();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation error for empty submission', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/email is required/i);
  });

  it('calls api.login with email on valid submit', async () => {
    vi.mocked(api.login).mockResolvedValue({
      token: 'tok123',
      user: { id: 1, email: 'test@example.com' },
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows error from api on failure', async () => {
    vi.mocked(api.login).mockRejectedValue(new Error('Server error'));

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/server error/i);
  });

  it('disables button while loading', async () => {
    let resolve!: (v: unknown) => void;
    vi.mocked(api.login).mockReturnValue(new Promise((r) => (resolve = r as (v: unknown) => void)));

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'x@x.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button')).toBeDisabled();

    await act(async () => {
      resolve({ token: 'tok', user: { id: 1, email: 'x@x.com' } });
    });
  });
});
