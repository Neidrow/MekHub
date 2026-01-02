
import React, { useEffect, useState } from 'react';

interface WelcomeOverlayProps {
  garageName: string;
  onComplete: () => void;
}

const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ garageName, onComplete }) => {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // On lance la dissipation après 3 secondes
    const timer = setTimeout(() => {
      setIsFading(true);
    }, 3000);

    // On ferme complètement l'overlay après 4 secondes
    const closeTimer = setTimeout(() => {
      onComplete();
    }, 4200);

    return () => {
      clearTimeout(timer);
      clearTimeout(closeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Fond Dégradé Ciel */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-500"></div>

      {/* Nuages Animés */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`absolute transition-all duration-[2000ms] ease-in-out`}
            style={{
              top: `${Math.random() * 80}%`,
              left: `${Math.random() * 80}%`,
              transform: isFading 
                ? `translateX(${i % 2 === 0 ? '-150%' : '150%'}) translateY(${Math.random() * 50 - 25}%) scale(1.5)` 
                : 'translateX(0) scale(1)',
              opacity: isFading ? 0 : 0.8,
            }}
          >
            <svg
              width={200 + Math.random() * 150}
              viewBox="0 0 24 24"
              fill="white"
              className={`animate-pulse`}
              style={{ animationDuration: `${3 + Math.random() * 2}s` }}
            >
              <path d="M17.5,19c-3.037,0-5.5-2.463-5.5-5.5c0-0.101,0.003-0.201,0.009-0.3c-1.353,0.573-2.846,0.891-4.418,0.891 C4.352,14.091,1.5,11.239,1.5,7.732c0-3.507,2.852-6.359,6.359-6.359c1.036,0,2.012,0.25,2.872,0.69 C11.398,0.825,12.871,0,14.5,0c2.761,0,5,2.239,5,5c0,0.147-0.007,0.292-0.019,0.436C21.432,6.347,23,8.487,23,11 C23,15.418,19.418,19,17.5,19z" />
            </svg>
          </div>
        ))}
      </div>

      {/* Message de Bienvenue */}
      <div className={`relative z-10 text-center px-6 transition-all duration-1000 ${isFading ? 'scale-110 opacity-0' : 'scale-100 opacity-100'}`}>
        <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl animate-bounce">
          <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4 drop-shadow-lg">
          Bienvenue chez vous !
        </h1>
        <p className="text-xl md:text-2xl font-bold text-white/90 drop-shadow-md">
          L'atelier <span className="underline decoration-white/50">{garageName}</span> est prêt à décoller.
        </p>
      </div>
    </div>
  );
};

export default WelcomeOverlay;
