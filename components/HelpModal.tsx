
import React, { useState } from 'react';

interface HelpModalProps {
  onClose: () => void;
}

const HELP_SECTIONS = [
  {
    id: 'dashboard',
    title: 'Tableau de Bord',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
    ),
    details: [
      {
        emoji: '📊',
        subtitle: 'Statistiques en direct',
        text: 'Visualisez en un coup d\'œil votre Chiffre d\'Affaires du mois, la croissance de votre clientèle et l\'état de votre parc automobile.'
      },
      {
        emoji: '📅',
        subtitle: 'Planning du jour',
        text: 'La liste des interventions prévues aujourd\'hui s\'affiche automatiquement pour ne rien rater dès le matin.'
      },
      {
        emoji: '🚀',
        subtitle: 'Action rapide',
        text: 'Utilisez le bouton "Nouveau RDV" pour une saisie express sans avoir à naviguer dans l\'agenda complet.'
      }
    ]
  },
  {
    id: 'agenda',
    title: 'Agenda & Rendez-vous',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
    ),
    details: [
      {
        emoji: '🗓️',
        subtitle: 'Vue Mensuelle',
        text: 'Naviguez facilement entre les mois pour anticiper la charge de travail globale de l\'atelier.'
      },
      {
        emoji: '🎨',
        subtitle: 'Codes couleurs intuitifs',
        text: 'Bleu (Planifié), Orange (En cours), Vert (Terminé), Rouge (Annulé). Identifiez le statut d\'un coup d\'œil.'
      },
      {
        emoji: '🔄',
        subtitle: 'Synchronisation Google',
        text: 'Si activée dans les paramètres, vos RDV apparaissent directement sur votre téléphone via Google Agenda.'
      }
    ]
  },
  {
    id: 'clients_vehicules',
    title: 'Clients & Véhicules',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.6 2 11.8 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
    ),
    details: [
      {
        emoji: '🗂️',
        subtitle: 'Fichier Centralisé',
        text: 'Créez une fiche client, puis associez-y autant de véhicules que nécessaire. Tout est lié.'
      },
      {
        emoji: '📜',
        subtitle: 'Historique complet',
        text: 'Retrouvez toutes les interventions passées sur un véhicule spécifique en un clic.'
      },
      {
        emoji: '🔍',
        subtitle: 'Recherche intelligente',
        text: 'Trouvez instantanément un dossier par nom, téléphone ou plaque d\'immatriculation.'
      }
    ]
  },
  {
    id: 'facturation',
    title: 'Devis & Factures',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
    ),
    details: [
      {
        emoji: '📝',
        subtitle: 'Devis vers Facture',
        text: 'Créez un devis détaillé. Une fois validé par le client, convertissez-le en facture définitive en un seul clic.'
      },
      {
        emoji: '📧',
        subtitle: 'Envoi par Email',
        text: 'Envoyez vos documents PDF professionnels directement au client depuis l\'application.'
      },
      {
        emoji: '💰',
        subtitle: 'Suivi des paiements',
        text: 'Gardez un œil sur les factures "En attente", "Payées" ou les acomptes versés.'
      }
    ]
  },
  {
    id: 'stock',
    title: 'Gestion des Stocks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
    ),
    details: [
      {
        emoji: '🚨',
        subtitle: 'Alertes Rupture',
        text: 'Définissez un seuil d\'alerte. Une notification rouge apparaît dès que le stock devient critique.'
      },
      {
        emoji: '📉',
        subtitle: 'Mouvements Rapides',
        text: 'Utilisez les boutons Entrée (+) et Sortie (-) pour ajuster les quantités lors des livraisons ou utilisations.'
      },
      {
        emoji: '📋',
        subtitle: 'Traçabilité',
        text: 'L\'historique enregistre qui a modifié le stock, quand et pour quelle raison.'
      }
    ]
  },
  {
    id: 'ia',
    title: 'Assistant IA',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
    ),
    details: [
      {
        emoji: '🤖',
        subtitle: 'Diagnostic Expert',
        text: 'Décrivez les symptômes (bruit, fumée, comportement) et l\'IA vous suggère immédiatement des causes probables.'
      },
      {
        emoji: '💬',
        subtitle: 'Rédacteur Automatique',
        text: 'Demandez à l\'IA de rédiger des SMS ou emails professionnels pour prévenir vos clients de l\'avancement des travaux.'
      }
    ]
  }
];

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const [openSection, setOpenSection] = useState<string | null>('dashboard');

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <div 
      className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 text-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner">
              <span className="text-2xl">💡</span>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Centre d'Aide</h2>
              <p className="text-slate-300 text-sm font-medium">Guide d'utilisation GaragePro</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 scrollbar-hide">
          {HELP_SECTIONS.map((section) => {
            const isOpen = openSection === section.id;
            return (
              <div 
                key={section.id} 
                className={`bg-white border transition-all duration-300 rounded-[1.5rem] overflow-hidden ${isOpen ? 'border-blue-200 shadow-xl ring-4 ring-blue-500/5' : 'border-slate-200 shadow-sm hover:border-blue-100'}`}
              >
                <button 
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-5 flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                      {section.icon}
                    </div>
                    <span className={`font-black text-sm tracking-tight ${isOpen ? 'text-slate-900' : 'text-slate-600'}`}>{section.title}</span>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-blue-50 text-blue-600 rotate-180' : 'bg-slate-50 text-slate-300'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>
                
                <div 
                  className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="p-6 pt-2 pb-8 border-t border-slate-50 grid gap-4">
                    {section.details.map((item, idx) => (
                      <div key={idx} className="flex gap-4 items-start p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                        <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-xl shadow-sm shrink-0">
                          {item.emoji}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm mb-1">{item.subtitle}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            {item.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 text-center shrink-0">
          <p className="text-xs font-bold text-slate-400">Besoin d'une assistance technique ? <a href="mailto:support@garagepro.saas" className="text-blue-600 hover:underline">Contactez le support</a></p>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
