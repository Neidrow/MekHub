
import React, { useState } from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="bg-slate-900 dark:bg-black p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <h1 className="text-3xl font-black tracking-tight relative z-10">Politique de Confidentialité</h1>
          <p className="text-slate-400 mt-2 font-medium relative z-10">Dernière mise à jour : {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="p-10 space-y-8 text-slate-600 dark:text-slate-300">
          
          <section>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">1. Introduction</h2>
            <p className="text-sm leading-relaxed">
              Bienvenue sur GaragePro ("nous", "notre"). Nous nous engageons à protéger votre vie privée et vos données personnelles. 
              Cette politique de confidentialité explique comment nous recueillons, utilisons et partageons vos informations lorsque vous utilisez notre application SaaS de gestion de garage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">2. Données collectées</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Informations de compte :</strong> Email, nom du garage, adresse, numéro de téléphone.</li>
              <li><strong>Données métier :</strong> Informations sur vos clients, véhicules, factures et devis saisis dans l'application.</li>
              <li><strong>Données techniques :</strong> Logs de connexion, adresses IP pour la sécurité et l'audit.</li>
            </ul>
          </section>

          <section className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
            <h2 className="text-xl font-black text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              3. Utilisation des données Google (Google User Data)
            </h2>
            <p className="text-sm leading-relaxed mb-3">
              GaragePro offre une intégration optionnelle avec <strong>Google Calendar</strong> pour synchroniser vos rendez-vous d'atelier.
            </p>
            <p className="text-sm leading-relaxed font-bold mb-2">Si vous choisissez de connecter votre compte Google :</p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>Nous accéderons à votre calendrier uniquement pour <strong>lire et écrire</strong> des événements liés à votre activité professionnelle.</li>
              <li><strong>Utilisation limitée :</strong> Les données de votre calendrier ne sont utilisées que pour afficher vos disponibilités dans GaragePro et exporter vos rendez-vous GaragePro vers Google Calendar.</li>
              <li><strong>Pas de partage :</strong> Vos données Google ne sont partagées avec aucun tiers, ni utilisées pour de la publicité.</li>
              <li>Le traitement des informations reçues des API Google respecte la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="underline text-blue-600">Politique relative aux données utilisateur des services API Google</a>, y compris les exigences d'utilisation limitée.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">4. Sécurité des données</h2>
            <p className="text-sm leading-relaxed">
              Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées (chiffrement, contrôles d'accès, audit) pour protéger vos données contre tout accès non autorisé, modification ou destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">5. Contact</h2>
            <p className="text-sm leading-relaxed">
              Pour toute question concernant cette politique ou pour exercer vos droits (accès, rectification, suppression), veuillez nous contacter à : <br/>
              <strong>Email :</strong> ishlem.pro@gmail.com
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-950 p-8 border-t border-slate-200 dark:border-slate-800 text-center">
          <a href="/" className="inline-block px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-xl text-xs uppercase tracking-widest hover:scale-105 transition-transform">
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
