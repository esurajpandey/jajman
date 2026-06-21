import type { FaqEntry } from './types';

export const faqEntries: FaqEntry[] = [
  { id: 'faq-1', topic: 'Booking', question: 'How do I book a pandit?', answer: 'Open a pandit profile, tap Book, then choose the puja, date, address, and confirm. You pay a small advance to confirm.' },
  { id: 'faq-2', topic: 'Booking', question: 'Can I book for an urgent same-day puja?', answer: 'Yes — use "Urgent booking" on the Home screen. An emergency surcharge applies and eligibility depends on the time window.' },
  { id: 'faq-3', topic: 'Payments', question: 'How much advance do I pay?', answer: 'The advance is 30% of the estimated total. The remaining amount is paid after the puja is completed.' },
  { id: 'faq-4', topic: 'Payments', question: 'How do refunds work if I cancel?', answer: 'Jajman-initiated cancellations are refunded minus a 5% platform cut on the amount paid. Pandit-initiated cancellations are refunded in full.' },
  { id: 'faq-5', topic: 'Disputes', question: 'What if something goes wrong?', answer: 'Open the booking and choose "Raise dispute". Add a reason and evidence; our team reviews it and proposes a resolution.' },
  { id: 'faq-6', topic: 'Account', question: 'How do I change my language or theme?', answer: 'Go to Profile → Language for app language, and Profile → Settings → Appearance for light/dark theme.' },
];
