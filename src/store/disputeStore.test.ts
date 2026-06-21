import { describe, it, expect, beforeEach } from 'vitest';
import { useDisputeStore } from './disputeStore';
import { seedDisputes } from '../mock/seed';

beforeEach(() => useDisputeStore.setState({ disputes: seedDisputes }));

describe('disputeStore', () => {
  it('createDispute adds an open dispute with a timeline entry', () => {
    const d = useDisputeStore.getState().createDispute(
      { bookingId: 'bkg-demo-3', reasonCode: 'pandit_no_show', description: 'No-show', evidence: [] },
      '2026-06-21T09:00:00.000Z',
    );
    expect(d.status).toBe('open');
    expect(d.timeline[0]).toEqual({ status: 'open', at: '2026-06-21T09:00:00.000Z' });
    expect(useDisputeStore.getState().getDispute(d.id)).toBeDefined();
  });
  it('addEvidence appends an attachment', () => {
    useDisputeStore.getState().addEvidence('dsp-1', { id: 'ev-x', kind: 'doc', name: 'receipt.pdf' });
    expect(useDisputeStore.getState().getDispute('dsp-1')!.evidence).toHaveLength(2);
  });
  it('getDisputes returns newest first', () => {
    const list = useDisputeStore.getState().getDisputes();
    expect(list[0].createdAt >= list[list.length - 1].createdAt).toBe(true);
  });
});
