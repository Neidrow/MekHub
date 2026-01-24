
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { ViewState } from '../types';

interface Step {
  targetId: string;
  title: string;
  description: string;
  emoji: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const TOUR_DATA: Record<string, Step[]> = {
  dashboard: [
    { targetId: 'tour-stats', emoji: '📊', title: 'Indicateurs clés', description: 'Suivez votre CA et vos statistiques de croissance ici.', position: 'bottom' },
    { targetId: 'tour-quick-rdv', emoji: '🚀', title: 'Action Rapide', description: 'Créez un nouveau rendez-vous sans quitter le tableau de bord.', position: 'left' },
    { targetId: 'tour-today-rdv', emoji: '📅', title: 'Planning du jour', description: 'Vos interventions prévues aujourd\'hui s\'affichent ici.', position: 'top' }
  ],
  appointments: [
    { targetId: 'tour-calendar-nav', emoji: '🗓️', title: 'Navigation temporelle', description: 'Changez de mois ou revenez à aujourd\'hui rapidement.', position: 'bottom' },
    { targetId: 'tour-timeline', emoji: '⏳', title: 'Frise chronologique', description: 'Sélectionnez un jour précis pour voir les détails des interventions.', position: 'bottom' },
    { targetId: 'tour-add-rdv', emoji: '➕', title: 'Planification', description: 'Ajoutez une nouvelle intervention technique ici.', position: 'left' }
  ],
  quotes: [
    { targetId: 'tour-add-quote', emoji: '📝', title: 'Création de Devis', description: 'Générez des devis professionnels en quelques clics.', position: 'left' },
    { targetId: 'tour-quote-filters', emoji: '🔍', title: 'Filtres de recherche', description: 'Retrouvez vos devis par statut ou par nom de client.', position: 'bottom' }
  ],
  inventory: [
    { targetId: 'tour-stock-add', emoji: '📦', title: 'Gestion de Stock', description: 'Ajoutez vos pièces et consommables dans votre inventaire.', position: 'left' },
    { targetId: 'tour-stock-cats', emoji: '🏷️', title: 'Catégories', description: 'Vos articles sont triés automatiquement pour une meilleure visibilité.', position: 'bottom' }
  ],
  'ai-assistant': [
    { targetId: 'tour-ai-quota', emoji: '⚡', title: 'Quota IA', description: 'Surveillez votre consommation d\'intelligence artificielle ici.', position: 'bottom' },
    { targetId: 'tour-ai-input', emoji: '🤖', title: 'Expertise Technique', description: 'Décrivez les symptômes pour obtenir une analyse complète de l\'IA.', position: 'top' }
  ]
};

interface TutorialProps {
  view: ViewState;
  onClose: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ view, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, opacity: 0 });
  const steps = TOUR_DATA[view] || [];
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (steps[currentStep]) {
      const el = document.getElementById(steps[currentStep].targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setCoords({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setCoords(null);
      }
    }
  };

  useLayoutEffect(() => {
    updateCoords();
    const handleResize = () => updateCoords();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentStep, view]);

  useEffect(() => {
    if (!coords || !tooltipRef.current) return;

    const step = steps[currentStep];
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 20;
    const padding = 20;

    let targetTop = 0;
    let targetLeft = 0;

    // Calcul initial basé sur la position demandée
    switch (step.position) {
      case 'bottom':
        targetTop = coords.y + coords.h + gap;
        targetLeft = coords.x + coords.w / 2 - tooltipRect.width / 2;
        break;
      case 'top':
        targetTop = coords.y - tooltipRect.height - gap;
        targetLeft = coords.x + coords.w / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        targetTop = coords.y + coords.h / 2 - tooltipRect.height / 2;
        targetLeft = coords.x - tooltipRect.width - gap;
        break;
      case 'right':
        targetTop = coords.y + coords.h / 2 - tooltipRect.height / 2;
        targetLeft = coords.x + coords.w + gap;
        break;
      default:
        targetTop = window.innerHeight / 2 - tooltipRect.height / 2;
        targetLeft = window.innerWidth / 2 - tooltipRect.width / 2;
    }

    // Sécurité anti-débordement (Collision Detection)
    if (targetLeft < padding) targetLeft = padding;
    if (targetLeft + tooltipRect.width > window.innerWidth - padding) {
      targetLeft = window.innerWidth - tooltipRect.width - padding;
    }
    if (targetTop < padding) targetTop = padding;
    if (targetTop + tooltipRect.height > window.innerHeight - padding) {
      targetTop = window.innerHeight - tooltipRect.height - padding;
    }

    setTooltipPos({ top: targetTop, left: targetLeft, opacity: 1 });
  }, [coords, currentStep]);

  if (steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none overflow-hidden font-sans">
      {/* SVG Mask Overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {coords && (
              <rect 
                x={coords.x - 8} 
                y={coords.y - 8} 
                width={coords.w + 16} 
                height={coords.h + 16} 
                rx="16" 
                fill="black" 
                className="transition-all duration-500 ease-in-out"
              />
            )}
          </mask>
        </defs>
        <rect 
          x="0" y="0" 
          width="100%" height="100%" 
          fill="rgba(2, 6, 23, 0.85)" 
          mask="url(#spotlight-mask)" 
          className="backdrop-blur-[2px]"
        />
      </svg>

      {/* Spotlight Pulse Border */}
      {coords && (
        <div 
          className="absolute border-2 border-blue-500 rounded-2xl transition-all duration-500 ease-in-out pointer-events-none"
          style={{ 
            left: coords.x - 8, 
            top: coords.y - 8, 
            width: coords.w + 16, 
            height: coords.h + 16,
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.5)'
          }}
        >
          <div className="absolute inset-0 rounded-2xl animate-ping border-2 border-blue-400 opacity-20"></div>
        </div>
      )}

      {/* Floating Tooltip */}
      <div 
        ref={tooltipRef}
        className="absolute w-80 bg-[#0b1120] border border-slate-700 p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 ease-in-out pointer-events-auto"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          opacity: tooltipPos.opacity,
          transform: tooltipPos.opacity === 0 ? 'scale(0.95)' : 'scale(1)'
        }}
      >
        {/* Bouton Ignorer intégré directement en haut pour visibilité maximale */}
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 bg-slate-800/80 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700/50 shadow-lg"
        >
          Ignorer le tutoriel
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-900/20">
            {step.emoji}
          </div>
          <h3 className="text-lg font-black text-white tracking-tight leading-none">{step.title}</h3>
        </div>
        
        <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">
          {step.description}
        </p>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-5 bg-blue-500' : 'w-1.5 bg-slate-700'}`}></div>
            ))}
          </div>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button 
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 font-black rounded-xl text-[9px] uppercase tracking-widest hover:bg-slate-700 transition-all"
              >
                Retour
              </button>
            )}
            <button 
              onClick={() => currentStep < steps.length - 1 ? setCurrentStep(prev => prev + 1) : onClose()}
              className="px-6 py-2.5 bg-blue-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
            >
              {currentStep === steps.length - 1 ? 'Terminer' : 'Suivant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
