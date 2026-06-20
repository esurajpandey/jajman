import type { Category, Puja, PanditSummary } from './types';

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
  { id: 'pnd-1', name: 'Pandit Ramesh Sharma', city: 'Pune', distanceKm: 2.4, experienceYears: 18, rating: 4.9, ratingCount: 212, pujasCompleted: 540, languages: ['Hindi', 'Sanskrit'], specializations: ['Satyanarayan Katha', 'Griha Pravesh'], startingPrice: 1100, responseRatePct: 98, responseTimeMins: 12, status: 'approved', favorite: true },
  { id: 'pnd-2', name: 'Pandit Suresh Joshi', city: 'Pune', distanceKm: 3.8, experienceYears: 12, rating: 4.7, ratingCount: 154, pujasCompleted: 320, languages: ['Hindi', 'Marathi'], specializations: ['Ganesh Puja', 'Festival Puja'], startingPrice: 800, responseRatePct: 95, responseTimeMins: 20, status: 'approved', favorite: false },
  { id: 'pnd-3', name: 'Acharya Vinod Dubey', city: 'Mumbai', distanceKm: 5.1, experienceYears: 25, rating: 5.0, ratingCount: 301, pujasCompleted: 880, languages: ['Hindi', 'Sanskrit', 'English'], specializations: ['Maha Mrityunjaya Jaap', 'Yagna'], startingPrice: 2100, responseRatePct: 99, responseTimeMins: 8, status: 'approved', favorite: false },
  { id: 'pnd-4', name: 'Pandit Mohan Tiwari', city: 'Pune', distanceKm: 1.2, experienceYears: 9, rating: 4.5, ratingCount: 88, pujasCompleted: 160, languages: ['Hindi'], specializations: ['Shradh', 'Katha'], startingPrice: 900, responseRatePct: 90, responseTimeMins: 30, status: 'approved', favorite: false },
  { id: 'pnd-5', name: 'Pandit Gopal Mishra', city: 'Nashik', distanceKm: 8.6, experienceYears: 15, rating: 4.8, ratingCount: 176, pujasCompleted: 410, languages: ['Hindi', 'Sanskrit'], specializations: ['Marriage', 'Griha Pravesh'], startingPrice: 2500, responseRatePct: 96, responseTimeMins: 15, status: 'approved', favorite: false },
  { id: 'pnd-6', name: 'Pandit Anil Shastri', city: 'Pune', distanceKm: 4.3, experienceYears: 21, rating: 4.9, ratingCount: 198, pujasCompleted: 600, languages: ['Hindi', 'Sanskrit'], specializations: ['Temple Rituals', 'Jaap'], startingPrice: 1500, responseRatePct: 97, responseTimeMins: 10, status: 'approved', favorite: true },
  { id: 'pnd-7', name: 'Pandit Deepak Vyas', city: 'Mumbai', distanceKm: 6.7, experienceYears: 7, rating: 4.4, ratingCount: 52, pujasCompleted: 95, languages: ['Hindi', 'English'], specializations: ['Festival Puja'], startingPrice: 700, responseRatePct: 88, responseTimeMins: 40, status: 'approved', favorite: false },
  { id: 'pnd-8', name: 'Pandit Naveen Pandey', city: 'Pune', distanceKm: 3.0, experienceYears: 5, rating: 0, ratingCount: 0, pujasCompleted: 0, languages: ['Hindi'], specializations: ['Katha'], startingPrice: 600, responseRatePct: 0, responseTimeMins: 0, status: 'pending', favorite: false },
];
