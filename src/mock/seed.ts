import type { Category, Puja, PanditSummary, Review, Address, Booking, RecurringSeries } from './types';

export const seedCategories: Category[] = [
  { id: 'cat-katha', name: 'Katha', icon: '📿' },
  { id: 'cat-jaap', name: 'Jaap', icon: '🕉️' },
  { id: 'cat-marriage', name: 'Marriage', icon: '💍' },
  { id: 'cat-griha', name: 'Griha Pravesh', icon: '🏠' },
  { id: 'cat-festival', name: 'Festival Puja', icon: '🪔' },
  { id: 'cat-shradh', name: 'Shradh', icon: '🌸' },
  { id: 'cat-temple', name: 'Temple Rituals', icon: '🛕' },
];

export const seedPujas: Puja[] = [
  { id: 'puja-satyanarayan', categoryId: 'cat-katha', name: 'Satyanarayan Katha', suggestedDurationMins: 150, minAmount: 1100, maxAmount: 5100 },
  { id: 'puja-ganesh', categoryId: 'cat-festival', name: 'Ganesh Puja', suggestedDurationMins: 90, minAmount: 800, maxAmount: 3100 },
  { id: 'puja-mahamrityunjaya', categoryId: 'cat-jaap', name: 'Maha Mrityunjaya Jaap', suggestedDurationMins: 180, minAmount: 2100, maxAmount: 11000 },
  { id: 'puja-griha', categoryId: 'cat-griha', name: 'Griha Pravesh', suggestedDurationMins: 180, minAmount: 2500, maxAmount: 11000 },
];

export const seedPandits: PanditSummary[] = [
  {
    id: 'pnd-1', name: 'Pandit Ramesh Sharma', city: 'Pune', distanceKm: 2.4, experienceYears: 18, rating: 4.9, ratingCount: 212, pujasCompleted: 540, languages: ['Hindi', 'Sanskrit'], specializations: ['Satyanarayan Katha', 'Griha Pravesh'], startingPrice: 1100, responseRatePct: 98, responseTimeMins: 12, status: 'approved', favorite: true,
    about: 'Vedic scholar with two decades of experience performing Satyanarayan Katha and Griha Pravesh across Maharashtra. Known for clear explanations and punctuality.',
    supportedPujas: [
      { pujaId: 'puja-satyanarayan', charge: 1100, durationMins: 150 },
      { pujaId: 'puja-griha', charge: 2500, durationMins: 180 },
    ],
    serviceRadiusKm: 15,
    travelPreference: 'within',
  },
  {
    id: 'pnd-2', name: 'Pandit Suresh Joshi', city: 'Pune', distanceKm: 3.8, experienceYears: 12, rating: 4.7, ratingCount: 154, pujasCompleted: 320, languages: ['Hindi', 'Marathi'], specializations: ['Ganesh Puja', 'Festival Puja'], startingPrice: 800, responseRatePct: 95, responseTimeMins: 20, status: 'approved', favorite: false,
    about: 'Specialist in Ganesh Puja and festival ceremonies with over a decade of service in Pune. Fluent in Marathi and Hindi, making rituals easy to follow for all.',
    supportedPujas: [
      { pujaId: 'puja-ganesh', charge: 800, durationMins: 90 },
      { pujaId: 'puja-satyanarayan', charge: 1200, durationMins: 150 },
    ],
    serviceRadiusKm: 10,
    travelPreference: 'within',
  },
  {
    id: 'pnd-3', name: 'Acharya Vinod Dubey', city: 'Mumbai', distanceKm: 5.1, experienceYears: 25, rating: 5.0, ratingCount: 301, pujasCompleted: 880, languages: ['Hindi', 'Sanskrit', 'English'], specializations: ['Maha Mrityunjaya Jaap', 'Yagna'], startingPrice: 1500, responseRatePct: 99, responseTimeMins: 8, status: 'approved', favorite: false,
    about: 'Renowned Vedic acharya with 25 years of expertise in Maha Mrityunjaya Jaap and Yagna. Fluent in Sanskrit and English, bringing deep spiritual insight to every ritual.',
    supportedPujas: [
      { pujaId: 'puja-mahamrityunjaya', charge: 2100, durationMins: 180 },
      { pujaId: 'puja-satyanarayan', charge: 1500, durationMins: 150 },
    ],
    serviceRadiusKm: 25,
    travelPreference: 'anywhere',
  },
  {
    id: 'pnd-4', name: 'Pandit Mohan Tiwari', city: 'Pune', distanceKm: 1.2, experienceYears: 9, rating: 4.5, ratingCount: 88, pujasCompleted: 160, languages: ['Hindi'], specializations: ['Shradh', 'Katha'], startingPrice: 900, responseRatePct: 90, responseTimeMins: 30, status: 'approved', favorite: false,
    about: 'Experienced in Shradh and Katha ceremonies, Pandit Mohan provides respectful and dignified rituals with clear step-by-step guidance.',
    supportedPujas: [
      { pujaId: 'puja-satyanarayan', charge: 900, durationMins: 150 },
    ],
    serviceRadiusKm: 8,
    travelPreference: 'within',
  },
  {
    id: 'pnd-5', name: 'Pandit Gopal Mishra', city: 'Nashik', distanceKm: 8.6, experienceYears: 15, rating: 4.8, ratingCount: 176, pujasCompleted: 410, languages: ['Hindi', 'Sanskrit'], specializations: ['Marriage', 'Griha Pravesh'], startingPrice: 1300, responseRatePct: 96, responseTimeMins: 15, status: 'approved', favorite: false,
    about: 'Highly sought-after pandit for marriage ceremonies and Griha Pravesh in Nashik. Renowned for conducting flawless Vedic rituals with detailed explanations.',
    supportedPujas: [
      { pujaId: 'puja-griha', charge: 2500, durationMins: 180 },
      { pujaId: 'puja-satyanarayan', charge: 1300, durationMins: 150 },
    ],
    serviceRadiusKm: 20,
    travelPreference: 'outside',
  },
  {
    id: 'pnd-6', name: 'Pandit Anil Shastri', city: 'Pune', distanceKm: 4.3, experienceYears: 21, rating: 4.9, ratingCount: 198, pujasCompleted: 600, languages: ['Hindi', 'Sanskrit'], specializations: ['Temple Rituals', 'Jaap'], startingPrice: 1500, responseRatePct: 97, responseTimeMins: 10, status: 'approved', favorite: true,
    about: 'Senior pandit specializing in temple rituals and Jaap ceremonies. Two decades of experience in traditional Vedic practices across Pune region.',
    supportedPujas: [
      { pujaId: 'puja-mahamrityunjaya', charge: 1500, durationMins: 180 },
      { pujaId: 'puja-ganesh', charge: 1800, durationMins: 90 },
    ],
    serviceRadiusKm: 12,
    travelPreference: 'within',
  },
  {
    id: 'pnd-7', name: 'Pandit Deepak Vyas', city: 'Mumbai', distanceKm: 6.7, experienceYears: 7, rating: 4.4, ratingCount: 52, pujasCompleted: 95, languages: ['Hindi', 'English'], specializations: ['Festival Puja'], startingPrice: 700, responseRatePct: 88, responseTimeMins: 40, status: 'approved', favorite: false,
    about: 'Young and energetic pandit with a modern approach to festival pujas. Comfortable explaining rituals in English for families abroad or unfamiliar with Sanskrit.',
    supportedPujas: [
      { pujaId: 'puja-ganesh', charge: 700, durationMins: 90 },
    ],
    serviceRadiusKm: 5,
    travelPreference: 'within',
  },
  {
    id: 'pnd-8', name: 'Pandit Naveen Pandey', city: 'Pune', distanceKm: 3.0, experienceYears: 5, rating: 0, ratingCount: 0, pujasCompleted: 0, languages: ['Hindi'], specializations: ['Katha'], startingPrice: 600, responseRatePct: 0, responseTimeMins: 0, status: 'pending', favorite: false,
    about: 'New pandit eager to serve the community with traditional Katha ceremonies. Application currently under review.',
    supportedPujas: [],
    serviceRadiusKm: 5,
    travelPreference: 'within',
  },
];

export const seedReviews: Review[] = [
  { id: 'rev-1', panditId: 'pnd-1', jajmanName: 'Anita Kulkarni', rating: 5, text: 'Pandit ji performed the katha beautifully and on time. Highly recommended.', date: '2026-05-12' },
  { id: 'rev-2', panditId: 'pnd-1', jajmanName: 'Rohit Deshpande', rating: 5, text: 'Very knowledgeable and patient with all the rituals.', date: '2026-04-28' },
  { id: 'rev-3', panditId: 'pnd-1', jajmanName: 'Meera Shah', rating: 4, text: 'Good experience overall, arrived slightly late.', date: '2026-03-15' },
  { id: 'rev-4', panditId: 'pnd-2', jajmanName: 'Sandeep Rao', rating: 5, text: 'Ganesh puja was wonderful, family loved it.', date: '2026-05-02' },
  { id: 'rev-5', panditId: 'pnd-2', jajmanName: 'Priya Nair', rating: 4, text: 'Smooth booking and a calm, clear ceremony.', date: '2026-04-10' },
  { id: 'rev-6', panditId: 'pnd-3', jajmanName: 'Vikram Sethi', rating: 5, text: 'Acharya ji is exceptional. The jaap was deeply moving.', date: '2026-05-20' },
  { id: 'rev-7', panditId: 'pnd-3', jajmanName: 'Lakshmi Iyer', rating: 5, text: 'Best pandit we have ever booked. Worth every rupee.', date: '2026-04-30' },
  { id: 'rev-8', panditId: 'pnd-5', jajmanName: 'Arjun Mehta', rating: 5, text: 'Conducted our marriage ceremony flawlessly.', date: '2026-05-18' },
  { id: 'rev-9', panditId: 'pnd-6', jajmanName: 'Kavya Reddy', rating: 4, text: 'Very devotional temple rituals, would book again.', date: '2026-04-05' },
  { id: 'rev-10', panditId: 'pnd-4', jajmanName: 'Naveen Kumar', rating: 4, text: 'Did the shradh respectfully and explained each step.', date: '2026-03-22' },
];

export const seedAddresses: Address[] = [
  { id: 'addr-home', label: 'Home', type: 'home', line: '12 Tulsi Apartments, Kothrud', city: 'Pune', notes: 'Ring the bell twice' },
  { id: 'addr-parents', label: "Parents' home", type: 'parents', line: '4 Shanti Nagar, Aundh', city: 'Pune' },
  { id: 'addr-temple', label: 'Community temple', type: 'temple', line: 'Ganesh Mandir, FC Road', city: 'Pune' },
];

// One already-completed booking so the "pay remaining" screen is demoable before the Pandit surface exists.
export const seedBookings: Booking[] = [
  {
    id: 'bkg-demo-1',
    panditId: 'pnd-2',
    pujaId: 'puja-ganesh',
    type: 'single',
    status: 'completed',
    pujaStartISO: '2026-06-10T09:00:00.000Z',
    slotLabel: '10 Jun · 09:00 AM',
    addressId: 'addr-home',
    attachments: [],
    notes: '',
    isEmergency: false,
    charges: { base: 800, travel: 160, emergencySurcharge: 0, subtotal: 960 },
    advanceAmount: 288,
    remainingAmount: 672,
    amountPaid: 288,
    createdAt: '2026-06-01T09:00:00.000Z',
    requestExpiresAt: '2026-06-02T09:00:00.000Z',
    isDisputed: false,
  },
  {
    id: 'bkg-demo-2', panditId: 'pnd-1', pujaId: 'puja-satyanarayan', type: 'single', status: 'scheduled',
    pujaStartISO: '2026-07-05T09:00:00.000Z', slotLabel: '5 Jul · 09:00 AM', addressId: 'addr-home',
    attachments: [], notes: '', isEmergency: false,
    charges: { base: 1100, travel: 48, emergencySurcharge: 0, subtotal: 1148 },
    advanceAmount: 344, remainingAmount: 804, amountPaid: 344,
    createdAt: '2026-06-18T09:00:00.000Z', requestExpiresAt: '2026-06-19T09:00:00.000Z', isDisputed: false,
  },
  {
    id: 'bkg-demo-3', panditId: 'pnd-3', pujaId: 'puja-mahamrityunjaya', type: 'single', status: 'requested',
    pujaStartISO: '2026-07-12T11:00:00.000Z', slotLabel: '12 Jul · 11:00 AM', addressId: 'addr-temple',
    attachments: [], notes: '', isEmergency: false,
    charges: { base: 2100, travel: 102, emergencySurcharge: 0, subtotal: 2202 },
    advanceAmount: 661, remainingAmount: 1541, amountPaid: 0,
    createdAt: '2026-06-20T08:00:00.000Z', requestExpiresAt: '2026-06-21T08:00:00.000Z', isDisputed: false,
  },
  {
    id: 'bkg-demo-4', panditId: 'pnd-6', pujaId: 'puja-ganesh', type: 'single', status: 'rated',
    pujaStartISO: '2026-05-02T16:00:00.000Z', slotLabel: '2 May · 04:00 PM', addressId: 'addr-home',
    attachments: [], notes: '', isEmergency: false,
    charges: { base: 1500, travel: 86, emergencySurcharge: 0, subtotal: 1586 },
    advanceAmount: 476, remainingAmount: 1110, amountPaid: 1586,
    createdAt: '2026-04-20T09:00:00.000Z', requestExpiresAt: '2026-04-21T09:00:00.000Z', isDisputed: false,
  },
];

export const seedRecurring: RecurringSeries[] = [
  { id: 'rec-1', panditId: 'pnd-1', pujaId: 'puja-satyanarayan', interval: 'monthly', nextDate: '2026-07-15T09:00:00.000Z', status: 'active', generatedBookingIds: ['bkg-demo-1'], createdAt: '2026-05-15T09:00:00.000Z' },
];
