import { describe, it, expect, beforeEach } from 'vitest';
import { usePanditOnboardingStore } from './panditOnboardingStore';

beforeEach(() => usePanditOnboardingStore.setState(usePanditOnboardingStore.getInitialState()));

describe('panditOnboardingStore', () => {
  it('patchProfile and patchService merge into the draft', () => {
    usePanditOnboardingStore.getState().patchProfile({ name: 'Pandit Test', about: 'x', experienceYears: 5 });
    usePanditOnboardingStore.getState().patchService({ radiusKm: 12 });
    const d = usePanditOnboardingStore.getState().draft;
    expect(d.profile.name).toBe('Pandit Test');
    expect(d.service.radiusKm).toBe(12);
  });

  it('addSupportedPuja replaces an existing entry for the same pujaId (no dupes)', () => {
    const s = usePanditOnboardingStore.getState();
    s.addSupportedPuja({ pujaId: 'puja-ganesh', charge: 800, durationMins: 90 });
    s.addSupportedPuja({ pujaId: 'puja-ganesh', charge: 900, durationMins: 90 });
    const list = usePanditOnboardingStore.getState().draft.supportedPujas;
    expect(list).toHaveLength(1);
    expect(list[0].charge).toBe(900);
  });

  it('addCustomPuja flags isCustom and gets an id; removeCustomPuja drops it', () => {
    const c = usePanditOnboardingStore.getState().addCustomPuja({ name: 'Rudrabhishek', categoryId: 'cat-jaap', description: 'x', charge: 2100, additionalCharge: 500, durationMins: 120 });
    expect(c.isCustom).toBe(true);
    expect(usePanditOnboardingStore.getState().draft.customPujas).toHaveLength(1);
    usePanditOnboardingStore.getState().removeCustomPuja(c.id);
    expect(usePanditOnboardingStore.getState().draft.customPujas).toHaveLength(0);
  });

  it('addSlot/removeSlot manage specific-date slots', () => {
    const slot = usePanditOnboardingStore.getState().addSlot('2026-07-01', '09:00', '12:00');
    expect(usePanditOnboardingStore.getState().draft.availability.slots).toHaveLength(1);
    usePanditOnboardingStore.getState().removeSlot(slot.id);
    expect(usePanditOnboardingStore.getState().draft.availability.slots).toHaveLength(0);
  });

  it('submit produces a pending self-profile snapshot', () => {
    usePanditOnboardingStore.getState().patchProfile({ name: 'Pandit Test' });
    const p = usePanditOnboardingStore.getState().submit('user-1', '2026-06-21T09:00:00.000Z');
    expect(p.status).toBe('pending');
    expect(p.userId).toBe('user-1');
    expect(p.submittedAt).toBe('2026-06-21T09:00:00.000Z');
    expect(usePanditOnboardingStore.getState().profile?.status).toBe('pending');
  });

  it('submit snapshot is immutable: post-submit draft mutations do not bleed into stored profile', () => {
    const s = usePanditOnboardingStore.getState();
    s.addSupportedPuja({ pujaId: 'puja-ganesh', charge: 800, durationMins: 90 });
    s.submit('user-1', '2026-06-21T09:00:00.000Z');
    const snapshotLength = usePanditOnboardingStore.getState().profile!.supportedPujas.length;
    usePanditOnboardingStore.getState().addSupportedPuja({ pujaId: 'puja-lakshmi', charge: 999, durationMins: 90 });
    expect(usePanditOnboardingStore.getState().profile!.supportedPujas).toHaveLength(snapshotLength);
  });

  it('simulateApproval / simulateRejection update the snapshot status', () => {
    usePanditOnboardingStore.getState().submit('user-1', '2026-06-21T09:00:00.000Z');
    usePanditOnboardingStore.getState().simulateApproval();
    expect(usePanditOnboardingStore.getState().profile?.status).toBe('approved');
    usePanditOnboardingStore.getState().simulateRejection('Incomplete documents');
    expect(usePanditOnboardingStore.getState().profile?.status).toBe('rejected');
    expect(usePanditOnboardingStore.getState().profile?.rejectionReason).toBe('Incomplete documents');
  });
});
