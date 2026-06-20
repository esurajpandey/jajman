import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper } from '../../components/ui/Stepper';

const SLIDES = [
  { icon: '🔍', title: 'Find trusted pandits', body: 'Search nearby verified pandits by puja, language, and price.' },
  { icon: '📅', title: 'Book in a few taps', body: 'Pick a slot, share details, pay an advance — all in the app.' },
  { icon: '🙏', title: 'Celebrate with peace', body: 'Chat, coordinate, rate. Rebook your favourites anytime.' },
];

export function WelcomeScreen() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="flex justify-end">
        <button type="button" onClick={() => navigate('/auth/login')} className="text-sm text-muted">
          Skip
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="text-7xl" aria-hidden="true">{slide.icon}</div>
        <h1 className="mt-6 text-2xl font-bold">{slide.title}</h1>
        <p className="mt-2 max-w-xs text-muted">{slide.body}</p>
      </div>
      <div className="flex items-center justify-center pb-6">
        <Stepper total={SLIDES.length} current={i} />
      </div>
      <button
        type="button"
        onClick={() => (last ? navigate('/auth/login') : setI(i + 1))}
        className="h-12 w-full rounded-md bg-primary font-medium text-primary-fg"
      >
        {last ? 'Get started' : 'Next'}
      </button>
    </div>
  );
}
