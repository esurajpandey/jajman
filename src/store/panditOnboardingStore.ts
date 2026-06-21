import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  PanditOnboardingDraft, PanditSelfProfile, OnboardingProfile, OnboardingService,
  OnboardingSupportedPuja, OnboardingCustomPuja, OnboardingRecurring, OnboardingSlot,
} from '../mock/types';

export const emptyOnboardingDraft: PanditOnboardingDraft = {
  step: 0,
  profile: { name: '', about: '', experienceYears: 5, languages: [], specializations: [], city: '' },
  service: { radiusKm: 10, travelPreference: 'within', chargeForTravel: false, baseTravelFee: 0, perKmRate: 0 },
  supportedPujas: [],
  customPujas: [],
  documents: [],
  availability: { recurring: [], slots: [] },
};

interface CustomInput { name: string; categoryId: string; description: string; charge: number; additionalCharge: number; durationMins: number; }

interface State {
  draft: PanditOnboardingDraft;
  profile: PanditSelfProfile | null;
  resetDraft: () => void;
  patchProfile: (p: Partial<OnboardingProfile>) => void;
  patchService: (p: Partial<OnboardingService>) => void;
  setStep: (n: number) => void;
  addSupportedPuja: (sp: OnboardingSupportedPuja) => void;
  removeSupportedPuja: (pujaId: string) => void;
  addCustomPuja: (input: CustomInput) => OnboardingCustomPuja;
  removeCustomPuja: (id: string) => void;
  addDocument: (label: string) => void;
  removeDocument: (id: string) => void;
  setRecurring: (rec: OnboardingRecurring[]) => void;
  addSlot: (date: string, start: string, end: string) => OnboardingSlot;
  removeSlot: (id: string) => void;
  submit: (userId: string, nowISO: string) => PanditSelfProfile;
  simulateApproval: () => void;
  simulateRejection: (reason: string) => void;
}

// structuredClone-free deep default (avoids shared references across resets)
const freshDraft = (): PanditOnboardingDraft => ({
  step: 0,
  profile: { name: '', about: '', experienceYears: 5, languages: [], specializations: [], city: '' },
  service: { radiusKm: 10, travelPreference: 'within', chargeForTravel: false, baseTravelFee: 0, perKmRate: 0 },
  supportedPujas: [],
  customPujas: [],
  documents: [],
  availability: { recurring: [], slots: [] },
});

export const usePanditOnboardingStore = create<State>((set, get) => ({
  draft: freshDraft(),
  profile: null,
  resetDraft: () => set({ draft: freshDraft() }),
  patchProfile: (p) => set((s) => ({ draft: { ...s.draft, profile: { ...s.draft.profile, ...p } } })),
  patchService: (p) => set((s) => ({ draft: { ...s.draft, service: { ...s.draft.service, ...p } } })),
  setStep: (n) => set((s) => ({ draft: { ...s.draft, step: Math.max(s.draft.step, n) } })),
  addSupportedPuja: (sp) =>
    set((s) => ({
      draft: { ...s.draft, supportedPujas: [...s.draft.supportedPujas.filter((x) => x.pujaId !== sp.pujaId), sp] },
    })),
  removeSupportedPuja: (pujaId) =>
    set((s) => ({ draft: { ...s.draft, supportedPujas: s.draft.supportedPujas.filter((x) => x.pujaId !== pujaId) } })),
  addCustomPuja: (input) => {
    const c: OnboardingCustomPuja = { id: `cust-${nanoid(5)}`, isCustom: true, ...input };
    set((s) => ({ draft: { ...s.draft, customPujas: [...s.draft.customPujas, c] } }));
    return c;
  },
  removeCustomPuja: (id) =>
    set((s) => ({ draft: { ...s.draft, customPujas: s.draft.customPujas.filter((x) => x.id !== id) } })),
  addDocument: (label) =>
    set((s) => ({ draft: { ...s.draft, documents: [...s.draft.documents, { id: `doc-${nanoid(5)}`, label, name: `${label.toLowerCase().replace(/\s+/g, '-')}.pdf` }] } })),
  removeDocument: (id) =>
    set((s) => ({ draft: { ...s.draft, documents: s.draft.documents.filter((d) => d.id !== id) } })),
  setRecurring: (rec) => set((s) => ({ draft: { ...s.draft, availability: { ...s.draft.availability, recurring: rec } } })),
  addSlot: (date, start, end) => {
    const slot: OnboardingSlot = { id: `slot-${nanoid(5)}`, date, start, end };
    set((s) => ({ draft: { ...s.draft, availability: { ...s.draft.availability, slots: [...s.draft.availability.slots, slot] } } }));
    return slot;
  },
  removeSlot: (id) =>
    set((s) => ({ draft: { ...s.draft, availability: { ...s.draft.availability, slots: s.draft.availability.slots.filter((x) => x.id !== id) } } })),
  submit: (userId, nowISO) => {
    const d = get().draft;
    const profile: PanditSelfProfile = {
      userId, status: 'pending', submittedAt: nowISO,
      profile: { ...d.profile },
      service: { ...d.service },
      supportedPujas: d.supportedPujas.map((x) => ({ ...x })),
      customPujas: d.customPujas.map((x) => ({ ...x })),
      documents: d.documents.map((x) => ({ ...x })),
      availability: { recurring: d.availability.recurring.map((x) => ({ ...x })), slots: d.availability.slots.map((x) => ({ ...x })) },
    };
    set({ profile });
    return profile;
  },
  simulateApproval: () => set((s) => ({ profile: s.profile ? { ...s.profile, status: 'approved', rejectionReason: undefined } : s.profile })),
  simulateRejection: (reason) => set((s) => ({ profile: s.profile ? { ...s.profile, status: 'rejected', rejectionReason: reason } : s.profile })),
}));
