import { PriceSimulator, SUPPORTED_TICKERS } from '../src/services/priceSimulator';

describe('PriceSimulator', () => {
  let simulator: PriceSimulator;

  beforeEach(() => {
    jest.useFakeTimers();
    simulator = new PriceSimulator(1000);
  });

  afterEach(() => {
    simulator.stop();
    jest.useRealTimers();
  });

  it('returns prices for all supported tickers', () => {
    const prices = simulator.getAllPrices();
    expect(prices).toHaveLength(SUPPORTED_TICKERS.length);
    const tickers = prices.map((p) => p.ticker);
    for (const ticker of SUPPORTED_TICKERS) {
      expect(tickers).toContain(ticker);
    }
  });

  it('returns a specific ticker price', () => {
    const price = simulator.getPrice('GOOG');
    expect(price).not.toBeNull();
    expect(price!.ticker).toBe('GOOG');
    expect(price!.price).toBeGreaterThan(0);
  });

  it('returns null for unknown ticker', () => {
    const price = simulator.getPrice('AAPL');
    expect(price).toBeNull();
  });

  it('emits price events on each tick', () => {
    const events: string[] = [];
    simulator.on('price', (p: { ticker: string }) => events.push(p.ticker));
    simulator.start();
    jest.advanceTimersByTime(1000);
    expect(events.length).toBe(SUPPORTED_TICKERS.length);
  });

  it('prices change after a tick', () => {
    const before = simulator.getAllPrices().map((p) => p.price);
    simulator.start();
    jest.advanceTimersByTime(1000);
    const after = simulator.getAllPrices().map((p) => p.price);
    const changed = before.some((p, i) => p !== after[i]);
    expect(changed).toBe(true);
  });

  it('price includes change, changePercent and timestamp', () => {
    const price = simulator.getPrice('TSLA')!;
    expect(typeof price.change).toBe('number');
    expect(typeof price.changePercent).toBe('number');
    expect(price.timestamp).toMatch(/^\d{4}-/);
  });

  it('stops emitting after stop()', () => {
    const events: string[] = [];
    simulator.on('price', (p: { ticker: string }) => events.push(p.ticker));
    simulator.start();
    jest.advanceTimersByTime(1000);
    const countAfterOne = events.length;
    simulator.stop();
    jest.advanceTimersByTime(2000);
    expect(events.length).toBe(countAfterOne);
  });
});
