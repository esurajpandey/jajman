import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Gift, Copy, Check } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { ReferralHistoryRow } from '../../../components/comms/ReferralHistoryRow';
import { useReferralStore } from '../../../store/referralStore';
import type { ReferralType } from '../../../mock/types';

export function ReferralScreen() {
  const code = useReferralStore((s) => s.code);
  const history = useReferralStore(useShallow((s) => s.getHistory()));
  const [tab, setTab] = useState<ReferralType>('refer_jajman');
  const [copied, setCopied] = useState(false);

  const copy = () => {
    try { navigator.clipboard?.writeText(code); } catch { /* mock */ }
    setCopied(true);
  };

  return (
    <>
      <AppBar title="Refer & Earn" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-lg bg-secondary/10 p-4 text-center">
          <Gift size={28} className="mx-auto text-secondary" />
          <h2 className="mt-2 font-semibold">Invite friends, earn rewards</h2>
          <p className="text-sm text-muted">Share Pandit Seva with family and friends.</p>
        </div>

        <SegmentedControl<ReferralType>
          segments={[{ value: 'refer_jajman', label: 'Refer a Jajman' }, { value: 'refer_pandit', label: 'Refer a Pandit' }]}
          value={tab}
          onChange={setTab}
        />

        <h2 className="mb-1 mt-5 text-sm font-semibold">Your code</h2>
        <Card className="flex items-center justify-between p-3">
          <span className="font-mono text-lg font-semibold tracking-wide">{code}</span>
          <Button variant="outline" onClick={copy}>{copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}</Button>
        </Card>
        <p className="mt-2 text-xs text-muted">
          {tab === 'refer_pandit' ? 'Invite a pandit to offer their services.' : 'Invite a friend to book pujas.'}
        </p>

        <div className="mt-4 rounded-md border border-dashed border-border p-3 text-center text-xs text-muted">
          Rewards (wallet credit / cashback) — coming soon.
        </div>

        <h2 className="mb-1 mt-5 text-sm font-semibold">Your referrals</h2>
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No referrals yet.</p>
        ) : (
          <div className="rounded-md border border-border bg-surface px-3">
            {history.map((r) => <ReferralHistoryRow key={r.id} record={r} />)}
          </div>
        )}
      </div>
    </>
  );
}
