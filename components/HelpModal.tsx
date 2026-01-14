
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
    content: `
      Le tableau de bord est votre centre de contrôle quotidien.
      
      • **Statistiques :** Visualisez en un coup d'œil votre Chiffre d'Affaires du mois, le nombre de clients et de véhicules enregistrés.
      • **RDV du jour :** La liste des interventions prévues aujourd'hui s'affiche automatiquement.
      • **Action rapide :** Utilisez le bouton "Nouveau RDV" pour une saisie express sans passer par l'agenda complet.
    `
  },
  {
    id: 'agenda',
    title: 'Agenda & Rendez-vous',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
    ),
    content: `
      Gérez votre planning atelier efficacement.
      
      • **Vue Mensuelle :** Naviguez entre les mois pour voir la charge de travail globale.
      • **Codes couleurs :** 
        - Bleu : Planifié
        - Orange : En cours
        - Vert : Terminé
        - Rouge : Annulé
      • **Synchronisation Google :** Si activée dans les paramètres, vos RDV apparaissent directement sur votre téléphone via Google Agenda.
    `
  },
  {
    id: 'clients_vehicules',
    title: 'Clients & Véhicules',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.6 2 11.8 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
    ),
    content: `
      Votre base de données commerciale.
      
      • **Création :** Créez d'abord une fiche client, puis ajoutez-y un ou plusieurs véhicules.
      • **Historique :** En cliquant sur un véhicule, vous pouvez (selon votre version) consulter l'historique des interventions passées.
      • **Recherche :** Utilisez la barre de recherche pour retrouver un client par son nom ou un véhicule par sa plaque d'immatriculation.
    `
  },
  {
    id: 'facturation',
    title: 'Devis & Factures',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
    ),
    content: `
      Gérez tout le cycle de facturation.
      
      • **Devis :** Créez des devis détaillés. Une fois validé par le client, vous pouvez le transformer en facture en un clic.
      • **Factures :** Générez des factures professionnelles avec TVA automatique.
      • **Envoi Email :** Envoyez le PDF directement au client par email depuis l'application.
      • **Statuts :** Suivez les paiements (Brouillon, En attente, Payée).
    `
  },
  {
    id: 'stock',
    title: 'Gestion des Stocks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
    ),
    content: `
      Ne tombez plus jamais en rupture de stock.
      
      • **Alertes :** Définissez un seuil d'alerte pour chaque article. Une notification apparaît quand le stock est bas.
      • **Mouvements :** Utilisez les boutons d'entrée (+) et sortie (-) pour ajuster les quantités rapidement.
      • **Historique :** Suivez qui a modifié le stock et quand.
    `
  },
  {
    id: 'ia',
    title: 'Assistant IA',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
    ),
    content: `
      Un expert virtuel pour vous aider.
      
      • **Diagnostic :** Décrivez les symptômes (bruit, fumée, comportement) et l'IA vous suggère des causes probables.
      • **Communication :** Demandez à l'IA de rédiger des SMS ou emails professionnels pour prévenir vos clients de l'avancement des travaux.
    `
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
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Centre d'Aide</h2>
              <p className="text-slate-400 text-sm font-medium">Guide d'utilisation GaragePro</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50">
          {HELP_SECTIONS.map((section) => {
            const isOpen = openSection === section.id;
            return (
              <div 
                key={section.id} 
                className={`bg-white border transition-all duration-300 rounded-3xl overflow-hidden ${isOpen ? 'border-blue-200 shadow-lg' : 'border-slate-100 shadow-sm hover:border-blue-100'}`}
              >
                <button 
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-5 flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isOpen ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                      {section.icon}
                    </div>
                    <span className={`font-bold text-sm ${isOpen ? 'text-slate-900' : 'text-slate-600'}`}>{section.title}</span>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="p-6 pt-0 text-sm text-slate-500 leading-relaxed whitespace-pre-line border-t border-slate-50 mt-2">
                    {section.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 text-center">
          <p className="text-xs font-bold text-slate-400">Besoin d'une assistance technique ? <a href="mailto:support@garagepro.saas" className="text-blue-600 hover:underline">Contactez le support</a></p>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
