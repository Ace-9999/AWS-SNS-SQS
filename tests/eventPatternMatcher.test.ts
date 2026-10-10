import { describe, it, expect } from 'vitest';
import { matchEventPattern } from '../src/engine/eventPatternMatcher';
import { SimulationEvent } from '../src/engine/types';

describe('EventBridge Pattern Matcher Engine', () => {
  const baseEvent: SimulationEvent = {
    id: 'evt-123',
    traceId: 'trace-123',
    time: new Date().toISOString(),
    source: 'com.shop.orders',
    detailType: 'OrderCreated',
    detail: {
      orderId: 'ord-999',
      amount: 150,
      currency: 'USD',
      status: 'PENDING',
      customer: {
        id: 'cust-42',
        tier: 'GOLD',
      },
      tags: ['electronics', 'priority'],
    },
  };

  it('matches exact string, source, and detail-type', () => {
    const pattern = {
      source: ['com.shop.orders'],
      'detail-type': ['OrderCreated', 'OrderUpdated'],
    };

    const res = matchEventPattern(pattern, baseEvent);
    expect(res.matches).toBe(true);
    expect(res.reasons.length).toBe(0);
  });

  it('fails with clear reason when source does not match', () => {
    const pattern = {
      source: ['com.shop.inventory'],
    };

    const res = matchEventPattern(pattern, baseEvent);
    expect(res.matches).toBe(false);
    expect(res.reasons.length).toBeGreaterThan(0);
    expect(res.reasons[0]).toContain('source: expected exact "com.shop.inventory", got "com.shop.orders"');
  });

  it('matches prefix condition', () => {
    const pattern = {
      detail: {
        orderId: [{ prefix: 'ord-' }],
      },
    };

    const res = matchEventPattern(pattern, baseEvent);
    expect(res.matches).toBe(true);
  });

  it('fails prefix condition with clear reason', () => {
    const pattern = {
      detail: {
        orderId: [{ prefix: 'inv-' }],
      },
    };

    const res = matchEventPattern(pattern, baseEvent);
    expect(res.matches).toBe(false);
    expect(res.reasons[0]).toContain('detail.orderId: expected prefix "inv-", got "ord-999"');
  });

  it('matches suffix condition', () => {
    const pattern = {
      detail: {
        orderId: [{ suffix: '-999' }],
      },
    };

    const res = matchEventPattern(pattern, baseEvent);
    expect(res.matches).toBe(true);
  });

  it('matches anything-but condition', () => {
    const pattern = {
      detail: {
        status: [{ 'anything-but': 'CANCELLED' }],
      },
    };

    const res = matchEventPattern(pattern, baseEvent);
    expect(res.matches).toBe(true);
  });

  it('fails anything-but condition when prohibited value matches', () => {
    const pattern = {
      detail: {
        status: [{ 'anything-but': 'PENDING' }],
      },
    };

    const res = matchEventPattern(pattern, baseEvent);
    expect(res.matches).toBe(false);
    expect(res.reasons[0]).toContain('detail.status: expected anything-but "PENDING", got "PENDING"');
  });

  it('matches numeric range condition', () => {
    const pattern = {
      detail: {
        amount: [{ numeric: ['>=', 100, '<=', 200] }],
      },
    };

    const res = matchEventPattern(pattern, baseEvent);
    expect(res.matches).toBe(true);
  });

  it('fails numeric range with exact boundary diagnostic', () => {
    const pattern = {
      detail: {
        amount: [{ numeric: ['>=', 200] }],
      },
    };

    const res = matchEventPattern(pattern, baseEvent);
    expect(res.matches).toBe(false);
    expect(res.reasons[0]).toContain('detail.amount: expected numeric >= 200, got 150');
  });

  it('evaluates exists: true and exists: false', () => {
    const existsPattern = {
      detail: {
        customer: {
          tier: [{ exists: true }],
        },
      },
    };
    expect(matchEventPattern(existsPattern, baseEvent).matches).toBe(true);

    const missingPattern = {
      detail: {
        discountCode: [{ exists: false }],
      },
    };
    expect(matchEventPattern(missingPattern, baseEvent).matches).toBe(true);

    const shouldFailExists = {
      detail: {
        discountCode: [{ exists: true }],
      },
    };
    const failRes = matchEventPattern(shouldFailExists, baseEvent);
    expect(failRes.matches).toBe(false);
    expect(failRes.reasons[0]).toContain('detail.discountCode: expected field to exist, but field was missing');
  });

  it('matches nested structures', () => {
    const pattern = {
      detail: {
        customer: {
          tier: ['GOLD', 'PLATINUM'],
        },
      },
    };

    const res = matchEventPattern(pattern, baseEvent);
    expect(res.matches).toBe(true);
  });

  it('matches array contents in event payload', () => {
    const pattern = {
      detail: {
        tags: ['priority'],
      },
    };

    const res = matchEventPattern(pattern, baseEvent);
    expect(res.matches).toBe(true);
  });
});

