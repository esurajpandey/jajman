import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { BookingAttachment, Dispute, DisputeReason } from '../mock/types';
import { seedDisputes } from '../mock/seed';

interface CreateDisputeInput {
  bookingId: string;
  reasonCode: DisputeReason;
  description: string;
  evidence: BookingAttachment[];
}

interface DisputeState {
  disputes: Dispute[];
  getDisputes: () => Dispute[];
  getDispute: (id: string) => Dispute | undefined;
  createDispute: (input: CreateDisputeInput, nowISO: string) => Dispute;
  addEvidence: (id: string, att: BookingAttachment) => void;
}

export const useDisputeStore = create<DisputeState>((set, get) => ({
  disputes: seedDisputes,
  getDisputes: () => [...get().disputes].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  getDispute: (id) => get().disputes.find((d) => d.id === id),
  createDispute: (input, nowISO) => {
    const dispute: Dispute = {
      id: `dsp-${nanoid(6)}`,
      bookingId: input.bookingId,
      reasonCode: input.reasonCode,
      description: input.description,
      status: 'open',
      evidence: input.evidence,
      activity: [],
      timeline: [{ status: 'open', at: nowISO }],
      createdAt: nowISO,
    };
    set((s) => ({ disputes: [dispute, ...s.disputes] }));
    return dispute;
  },
  addEvidence: (id, att) =>
    set((s) => ({ disputes: s.disputes.map((d) => (d.id === id ? { ...d, evidence: [...d.evidence, att] } : d)) })),
}));
