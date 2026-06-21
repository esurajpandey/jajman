import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationRow } from './NotificationRow';
import { DisputeListItem } from './DisputeListItem';
import { DisputeStepper } from './DisputeStepper';
import { ReferralHistoryRow } from './ReferralHistoryRow';
import type { AppNotification, Dispute, ReferralRecord } from '../../mock/types';

const notif: AppNotification = { id: 'n1', type: 'booking', title: 'Booking accepted', body: 'Accepted.', read: false, createdAt: '2026-06-18T10:00:00.000Z' };
const dispute: Dispute = { id: 'd1', bookingId: 'b1', reasonCode: 'puja_incomplete', description: 'x', status: 'under_review', evidence: [], activity: [], timeline: [], createdAt: '2026-06-11T09:00:00.000Z' };
const ref: ReferralRecord = { id: 'r1', type: 'refer_jajman', inviteeName: 'Ananya G.', status: 'rewarded', rewardNote: '₹100', createdAt: '2026-04-15T09:00:00.000Z' };

describe('comms components', () => {
  it('NotificationRow shows title + unread dot and fires onClick', () => {
    const onClick = vi.fn();
    render(<NotificationRow n={notif} onClick={onClick} />);
    expect(screen.getByText('Booking accepted')).toBeInTheDocument();
    expect(screen.getByLabelText('Unread')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Booking accepted'));
    expect(onClick).toHaveBeenCalled();
  });
  it('DisputeListItem shows reason + status', () => {
    render(<DisputeListItem dispute={dispute} bookingRef="bkg-demo-1" onClick={() => {}} />);
    expect(screen.getByText('Puja incomplete')).toBeInTheDocument();
    expect(screen.getByText('Under review')).toBeInTheDocument();
  });
  it('DisputeStepper renders the review step as reached', () => {
    render(<DisputeStepper status="under_review" />);
    expect(screen.getByText('Under admin review')).toBeInTheDocument();
  });
  it('ReferralHistoryRow shows invitee + reward', () => {
    render(<ReferralHistoryRow record={ref} />);
    expect(screen.getByText('Ananya G.')).toBeInTheDocument();
    expect(screen.getByText('Rewarded')).toBeInTheDocument();
  });
});
