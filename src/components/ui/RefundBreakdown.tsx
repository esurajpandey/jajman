export function RefundBreakdown({ amountPaid, platformCut, refundAmount }: { amountPaid: number; platformCut: number; refundAmount: number }) {
  return (
    <div className="rounded-md border border-border bg-surface p-3 text-sm">
      <div className="flex justify-between py-0.5"><span className="text-muted">Amount paid</span><span>₹{amountPaid}</span></div>
      <div className="flex justify-between py-0.5"><span className="text-muted">Platform cut (5%)</span><span>−₹{platformCut}</span></div>
      <div className="my-1 border-t border-border" />
      <div className="flex justify-between py-0.5 font-semibold text-success"><span>You receive</span><span>₹{refundAmount}</span></div>
    </div>
  );
}
