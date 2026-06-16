import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StockCard } from '../src/components/StockCard';
import { StockPrice } from '../src/types';

const mockPrice: StockPrice = {
  ticker: 'GOOG',
  price: 175.50,
  change: 2.30,
  changePercent: 1.329,
  timestamp: new Date().toISOString(),
};

describe('StockCard', () => {
  it('renders ticker symbol', () => {
    render(
      <StockCard
        ticker="GOOG"
        price={undefined}
        subscribed={false}
        onSubscribe={vi.fn()}
        onUnsubscribe={vi.fn()}
      />
    );
    expect(screen.getByText('GOOG')).toBeInTheDocument();
  });

  it('shows Watch button when not subscribed', () => {
    render(
      <StockCard ticker="GOOG" price={undefined} subscribed={false} onSubscribe={vi.fn()} onUnsubscribe={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /watch/i })).toBeInTheDocument();
  });

  it('shows Unwatch button when subscribed', () => {
    render(
      <StockCard ticker="GOOG" price={mockPrice} subscribed={true} onSubscribe={vi.fn()} onUnsubscribe={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /unwatch/i })).toBeInTheDocument();
  });

  it('displays price when subscribed and price is available', () => {
    render(
      <StockCard ticker="GOOG" price={mockPrice} subscribed={true} onSubscribe={vi.fn()} onUnsubscribe={vi.fn()} />
    );
    expect(screen.getByText('$175.50')).toBeInTheDocument();
  });

  it('shows positive change in green class', () => {
    render(
      <StockCard ticker="GOOG" price={mockPrice} subscribed={true} onSubscribe={vi.fn()} onUnsubscribe={vi.fn()} />
    );
    const change = screen.getByText(/2\.30/);
    expect(change).toHaveClass('positive');
  });

  it('shows negative change in red class', () => {
    const negPrice = { ...mockPrice, change: -3.10, changePercent: -1.741 };
    render(
      <StockCard ticker="GOOG" price={negPrice} subscribed={true} onSubscribe={vi.fn()} onUnsubscribe={vi.fn()} />
    );
    const change = screen.getByText(/3\.10/);
    expect(change).toHaveClass('negative');
  });

  it('calls onSubscribe when Watch clicked', () => {
    const onSubscribe = vi.fn();
    render(
      <StockCard ticker="TSLA" price={undefined} subscribed={false} onSubscribe={onSubscribe} onUnsubscribe={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: /watch/i }));
    expect(onSubscribe).toHaveBeenCalledWith('TSLA');
  });

  it('calls onUnsubscribe when Unwatch clicked', () => {
    const onUnsubscribe = vi.fn();
    render(
      <StockCard ticker="TSLA" price={mockPrice} subscribed={true} onSubscribe={vi.fn()} onUnsubscribe={onUnsubscribe} />
    );
    fireEvent.click(screen.getByRole('button', { name: /unwatch/i }));
    expect(onUnsubscribe).toHaveBeenCalledWith('TSLA');
  });
});
