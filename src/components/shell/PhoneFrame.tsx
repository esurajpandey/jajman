import type { ReactNode } from 'react';

/**
 * Centered device frame on desktop (~390x844 with a bezel); full-viewport on mobile.
 * Only the inner column scrolls (children own the scroll region + bottom bar).
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#f3e3cc] to-[#ebd6bc] dark:from-[#0e0b0a] dark:to-[#1b1512] md:py-8">
      <div
        className="relative flex w-full flex-col overflow-hidden bg-bg text-text md:h-[844px] md:max-h-[92vh] md:w-[390px] md:rounded-[42px] md:border-[10px] md:border-[#15100e] md:shadow-float"
        style={{ height: '100dvh' }}
      >
        {children}
      </div>
    </div>
  );
}
