
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
    { targetId: 'app-sidebar', emoji: '🧭', title: 'Navigation', description: 'Utilisez ce menu pour basculer entre vos clients, factures, stock et paramètres.', position: 'right' },
    { targetId: 'app-notifications', emoji: '🔔', title: 'Centre de notifications', description: 'Alertes de stock bas, rappels de RDV et messages système apparaîtront ici.', position: 'left' },
    { targetId: 'dash-stats', emoji: '📊', title: 'Vue d\'ensemble', description: 'Suivez votre Chiffre d\'Affaires en temps réel et l\'évolution de votre activité mensuelle.', position: 'bottom' },
    { targetId: 'dash-quick-add', emoji: '⚡', title: 'Action Rapide', description: 'Un client appelle ? Créez un rendez-vous immédiatement sans changer de page.', position: 'left' },
    { targetId: 'dash-today-list', emoji: '📅', title: 'Planning du jour', description: 'Ne ratez rien : voici la liste prioritaire des interventions prévues aujourd\'hui.', position: 'top' }
  ],
  appointments: [
    { targetId: 'agenda-add-btn', emoji: '➕', title: 'Nouveau Rendez-vous', description: 'Cliquez ici pour planifier une intervention. Vous pourrez l\'assigner à un mécanicien et un véhicule.', position: 'left' },
    { targetId: 'agenda-filters', emoji: '🔍', title: 'Filtres Puissants', description: 'Retrouvez un RDV par client, ou filtrez pour voir le planning d\'un mécanicien spécifique.', position: 'bottom' },
    { targetId: 'agenda-nav', emoji: '🗓️', title: 'Navigation', description: 'Changez de mois ou revenez à la date d\'aujourd\'hui en un clic.', position: 'bottom' },
    { targetId: 'agenda-timeline', emoji: '⏳', title: 'Frise Chronologique', description: 'Sélectionnez un jour précis dans la liste pour voir le détail des créneaux horaires.', position: 'bottom' }
  ],
  customers: [
    { targetId: 'cust-add-btn', emoji: '👤', title: 'Créer un Client', description: 'Ajoutez une nouvelle fiche client. Vous pourrez ensuite y lier plusieurs véhicules.', position: 'left' },
    { targetId: 'cust-search', emoji: '🔎', title: 'Recherche Instantanée', description: 'Tapez un nom, un téléphone ou un email pour retrouver un dossier instantanément.', position: 'bottom' },
    { targetId: 'cust-list', emoji: '🗂️', title: 'Annuaire', description: 'Cliquez sur les boutons d\'action à droite d\'une ligne pour modifier ou contacter le client.', position: 'top' }
  ],
  vehicles: [
    { targetId: 'veh-add-btn', emoji: '🚗', title: 'Ajout Véhicule', description: 'Enregistrez un véhicule avec sa plaque et son VIN. Il doit être lié à un client existant.', position: 'left' },
    { targetId: 'veh-filters', emoji: '🔬', title: 'Filtres', description: 'Cherchez par immatriculation ou filtrez par propriétaire pour voir son parc automobile.', position: 'bottom' },
    { targetId: 'veh-list', emoji: '📜', title: 'Cartes Véhicules', description: 'Chaque carte contient les infos techniques. Utilisez le bouton "Historique" pour voir les travaux passés.', position: 'top' }
  ],
  quotes: [
    { targetId: 'quote-add-btn', emoji: '📝', title: 'Éditeur de Devis', description: 'Créez des devis professionnels. Calcule la TVA et les totaux automatiquement.', position: 'left' },
    { targetId: 'quote-filters', emoji: '🚦', title: 'Suivi des Statuts', description: 'Filtrez par "En attente" ou "Accepté" pour savoir qui relancer.', position: 'bottom' },
    { targetId: 'quote-list', emoji: '⚡', title: 'Actions Rapides', description: 'Depuis cette liste : envoyez le devis par email, téléchargez le PDF ou convertissez-le en facture.', position: 'top' }
  ],
  invoices: [
    { targetId: 'inv-add-btn', emoji: '💰', title: 'Facturation', description: 'Créez une facture libre ou issue d\'un devis. Gérez les acomptes ici.', position: 'left' },
    { targetId: 'inv-filters', emoji: '📉', title: 'Suivi Trésorerie', description: 'Utilisez les filtres pour voir les factures "Non payées" et gérer les relances.', position: 'bottom' },
    { targetId: 'inv-list', emoji: '📩', title: 'Gestion', description: 'Envoyez vos factures par email au client en un clic. Le statut passera automatiquement à "Envoyée".', position: 'top' }
  ],
  inventory: [
    { targetId: 'stock-stats', emoji: '📊', title: 'Vue d\'ensemble', description: 'Surveillez la valeur de votre stock et le nombre d\'articles en rupture (alertes rouges).', position: 'bottom' },
    { targetId: 'stock-add-btn', emoji: '📦', title: 'Réception de Stock', description: 'Ajoutez une nouvelle référence. Définissez un seuil d\'alerte pour être prévenu avant la rupture.', position: 'left' },
    { targetId: 'stock-cats', emoji: '🏷️', title: 'Organisation', description: 'Filtrez par catégorie (Pièce, Consommable...) ou utilisez la recherche par référence.', position: 'bottom' },
    { targetId: 'stock-list', emoji: '🔢', title: 'Gestion Unitaire', description: 'Sur chaque carte : Ajustez le stock (+/-), consultez l\'historique des mouvements ou modifiez la fiche.', position: 'top' }
  ],
  'ai-assistant': [
    { targetId: 'ai-quota', emoji: '⚡', title: 'Quota IA', description: 'Surveillez votre consommation de requêtes intelligentes (renouvelée chaque heure).', position: 'bottom' },
    { targetId: 'ai-tabs', emoji: '🧠', title: 'Modes IA', description: 'Basculez entre le "Diagnostic" pour les pannes et "Assistant Message" pour rédiger vos SMS.', position: 'bottom' },
    { targetId: 'ai-input', emoji: '💬', title: 'Zone de Saisie', description: 'Décrivez le problème (bruit, fumée...) ou le contexte du message ici. L\'IA fera le reste.', position: 'top' }
  ]
};

interface TutorialProps {
  currentView?: ViewState;
  view?: ViewState;
  onClose: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ currentView, view, onClose }) => {
  const activeView = currentView || view || 'dashboard';
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, opacity: 0 });
  
  const steps = TOUR_DATA[activeView] || [];
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (steps[currentStep]) {
      const el = document.getElementById(steps[currentStep].targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setCoords({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        } else {
          console.warn(`Tutorial target has zero dimensions: ${steps[currentStep].targetId}`);
          setCoords(null);
        }
      } else {
        console.warn(`Tutorial target not found: ${steps[currentStep].targetId}`);
        setCoords(null);
      }
    }
  };

  useLayoutEffect(() => {
    updateCoords();
    const handleResize = () => updateCoords();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [currentStep, activeView]);

  useEffect(() => {
    if (!coords || !tooltipRef.current) return;

    const step = steps[currentStep];
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 20;
    const padding = 20;

    let targetTop = 0;
    let targetLeft = 0;

    // Calcul de position de base
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
      default: // center
        targetTop = window.innerHeight / 2 - tooltipRect.height / 2;
        targetLeft = window.innerWidth / 2 - tooltipRect.width / 2;
    }

    // --- Logique Anti-Débordement ---

    // Horizontal
    if (targetLeft < padding) targetLeft = padding;
    if (targetLeft + tooltipRect.width > window.innerWidth - padding) {
      targetLeft = window.innerWidth - tooltipRect.width - padding;
    }

    // Vertical
    // Si déborde en haut, on le force au min padding (quitte à couvrir l'élément, l'utilisateur peut scroller)
    // Idéalement on changerait la position (top -> bottom) mais restons simple pour la stabilité.
    if (targetTop < padding) targetTop = padding;
    
    // Si déborde en bas
    if (targetTop + tooltipRect.height > window.innerHeight - padding) {
      targetTop = window.innerHeight - tooltipRect.height - padding;
      // Si après correction bas, ça déborde en haut (écran trop petit), on force le haut à padding
      if (targetTop < padding) targetTop = padding;
    }

    setTooltipPos({ top: targetTop, left: targetLeft, opacity: 1 });
  }, [coords, currentStep]);

  if (steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden font-sans">
      {/* SVG Mask Overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto z-[9999]">
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
        className="absolute w-[90vw] max-w-sm bg-[#0b1120] border border-slate-700 p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 ease-in-out pointer-events-auto z-[10000]"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          opacity: tooltipPos.opacity,
          transform: tooltipPos.opacity === 0 ? 'scale(0.95)' : 'scale(1)'
        }}
      >
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 bg-slate-800/80 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700/50 shadow-lg pointer-events-auto"
        >
          Passer
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-900/20 shrink-0">
            {step.emoji}
          </div>
          <div>
             <h3 className="text-lg font-black text-white tracking-tight leading-none">{step.title}</h3>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Étape {currentStep + 1} / {steps.length}</p>
          </div>
        </div>
        
        <div className="max-h-[20vh] overflow-y-auto mb-6 pr-2 scrollbar-hide">
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            {step.description}
          </p>
        </div>
        
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
