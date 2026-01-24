
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ViewState } from '../types';

interface Step {
  targetId: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TUTORIAL_DATA: Record<string, Step[]> = {
  dashboard: [
    { targetId: 'tour-stats', title: 'Indicateurs de Performance', description: 'Voici votre chiffre d\'affaires et vos statistiques clés mis à jour en temps réel.', position: 'bottom' },
    { targetId: 'tour-new-appointment', title: 'Planification Rapide', description: 'Cliquez ici pour ajouter un nouveau rendez-vous sans quitter le tableau de bord.', position: 'left' },
    { targetId: 'tour-today-list', title: 'Votre Journée', description: 'Consultez ici la liste des interventions prévues pour aujourd\'hui.', position: 'top' }
  ],
  settings: [
    { targetId: 'tour-logo-upload', title: 'Identité Visuelle', description: 'Importez votre logo ici. Il apparaîtra sur tous vos devis et factures.', position: 'right' },
    { targetId: 'tour-vat-config', title: 'Fiscalité', description: 'Configurez votre taux de TVA et vos mentions légales pour être en règle.', position: 'top' },
    { targetId: 'tour-google-sync', title: 'Synchronisation Agenda', description: 'Connectez votre compte Google pour retrouver vos RDV sur votre smartphone.', position: 'bottom' }
  ],
  appointments: [
    { targetId: 'tour-calendar-nav', title: 'Navigation Temporelle', description: 'Passez d\'un mois à l\'autre pour gérer votre charge de travail future.', position: 'bottom' },
    { targetId: 'tour-timeline', title: 'Planning Interactif', description: 'Visualisez vos créneaux. Cliquez sur un jour pour voir les détails.', position: 'top' }
  ],
  customers: [
    { targetId: 'tour-search-customers', title: 'Recherche Intelligente', description: 'Trouvez un client instantanément par son nom ou son téléphone.', position: 'bottom' },
    { targetId: 'tour-add-customer', title: 'Nouveau Dossier', description: 'Enregistrez un nouveau client et ses coordonnées en quelques secondes.', position: 'left' }
  ],
  inventory: [
    { targetId: 'tour-filters-inventory', title: 'Filtres Catégories', description: 'Triez vos pièces par famille (Huiles, Freinage, etc.).', position: 'bottom' },
    { targetId: 'tour-add-item', title: 'Entrée en Stock', description: 'Ajoutez une nouvelle référence ou mettez à jour vos quantités ici.', position: 'left' }
  ],
  quotes: [
    { targetId: 'tour-add-quote', title: 'Éditeur de Devis', description: 'Créez des devis détaillés avec signature électronique incluse.', position: 'left' }
  ],
  invoices: [
    { targetId: 'tour-add-invoice', title: 'Facturation Directe', description: 'Générez des factures à partir de rien ou suivez vos paiements.', position: 'left' }
  ],
  'ai-assistant': [
    { targetId: 'tour-ai-input', title: 'Diagnostic Expert', description: 'Décrivez les symptômes ici pour obtenir une analyse technique immédiate.', position: 'bottom' }
  ]
};

interface TutorialProps {
  view: ViewState;
  onClose: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ view, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const steps = TUTORIAL_DATA[view] || [];
  const requestRef = useRef<number>(null);

  // Mettre à jour la position du spotlight
  const updatePosition = () => {
    if (steps[currentStep]) {
      const el = document.getElementById(steps[currentStep].targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        // Si l'élément n'est pas trouvé (ex: pas encore rendu), on réessaie
        requestRef.current = requestAnimationFrame(updatePosition);
      }
    }
  };

  useLayoutEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [currentStep, view]);

  if (steps.length === 0 || !targetRect) return null;

  const step = steps[currentStep];

  // Calcul position de la bulle
  const getBubbleStyle = () => {
    if (!targetRect) return {};
    const margin = 20;
    switch (step.position) {
      case 'bottom': return { top: targetRect.bottom + margin, left: targetRect.left + (targetRect.width/2) - 160 };
      case 'top': return { top: targetRect.top - 200 - margin, left: targetRect.left + (targetRect.width/2) - 160 };
      case 'left': return { top: targetRect.top, left: targetRect.left - 320 - margin };
      case 'right': return { top: targetRect.top, left: targetRect.right + margin };
      default: return { top: targetRect.bottom + margin, left: targetRect.left };
    }
  };

  return (
    <div className="fixed inset-0 z-[500] pointer-events-none">
      {/* Overlay avec masque SVG pour le spotlight */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect 
              x={targetRect.left - 8} 
              y={targetRect.top - 8} 
              width={targetRect.width + 16} 
              height={targetRect.height + 16} 
              rx="12" 
              fill="black" 
            />
          </mask>
        </defs>
        <rect 
          width="100%" 
          height="100%" 
          fill="rgba(15, 23, 42, 0.85)" 
          mask="url(#spotlight-mask)" 
          className="transition-all duration-500"
        />
      </svg>

      {/* Bulle d'information */}
      <div 
        className="absolute w-80 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl p-6 pointer-events-auto animate-in fade-in zoom-in duration-300 border border-blue-100 dark:border-slate-700"
        style={getBubbleStyle()}
      >
        <div className="flex items-center gap-3 mb-4">
           <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black shadow-lg">
             {currentStep + 1}
           </div>
           <h3 className="font-black text-slate-800 dark:text-white leading-tight">{step.title}</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6">
          {step.description}
        </p>
        
        <div className="flex items-center justify-between">
           <div className="flex gap-1">
              {steps.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-200 dark:bg-slate-800'}`}></div>
              ))}
           </div>
           <div className="flex gap-2">
             {currentStep > 0 && (
               <button 
                 onClick={() => setCurrentStep(prev => prev - 1)}
                 className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
               </button>
             )}
             <button 
               onClick={() => currentStep < steps.length - 1 ? setCurrentStep(prev => prev + 1) : onClose()}
               className="px-6 py-2 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all"
             >
               {currentStep === steps.length - 1 ? "Terminer" : "Suivant"}
             </button>
           </div>
        </div>

        <button 
          onClick={onClose}
          className="mt-4 w-full text-center text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
        >
          Quitter la visite
        </button>
      </div>
    </div>
  );
};

export default Tutorial;
