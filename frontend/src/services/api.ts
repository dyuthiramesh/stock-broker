const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data as T;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export const api = {
  login(email: string) {
    return request<{ token: string; user: { id: number; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  getSubscriptions(token: string) {
    return request<{ subscriptions: string[] }>('/subscriptions', {
      headers: authHeaders(token),
    });
  },

  subscribe(token: string, ticker: string) {
    return request<{ subscription: string }>('/subscriptions', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ ticker }),
    });
  },

  unsubscribe(token: string, ticker: string) {
    return request<{ message: string }>(`/subscriptions/${ticker}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
  },

  getAllPrices(token: string) {
    return request<{ prices: import('../types').StockPrice[]; tickers: string[] }>('/stocks', {
      headers: authHeaders(token),
    });
  },
};
