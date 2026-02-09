
import React from 'react';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="bg-slate-900 dark:bg-black p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -ml-20 -mt-20"></div>
          <h1 className="text-3xl font-black tracking-tight relative z-10">Conditions Générales d'Utilisation</h1>
          <p className="text-slate-400 mt-2 font-medium relative z-10">Dernière mise à jour : {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="p-10 space-y-8 text-slate-600 dark:text-slate-300">
          
          <section>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">1. Acceptation des conditions</h2>
            <p className="text-sm leading-relaxed">
              En accédant et en utilisant le logiciel GaragePro (le "Service"), vous acceptez d'être lié par les présentes Conditions Générales d'Utilisation ("CGU"). Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">2. Description du Service</h2>
            <p className="text-sm leading-relaxed">
              GaragePro est une solution SaaS (Software as a Service) destinée aux professionnels de l'automobile pour la gestion de leur atelier (clients, véhicules, devis, factures, stocks). Nous nous réservons le droit de modifier ou d'interrompre le Service à tout moment, avec ou sans préavis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">3. Compte et Sécurité</h2>
            <p className="text-sm leading-relaxed">
              Vous êtes responsable du maintien de la confidentialité de vos identifiants de connexion. GaragePro ne saurait être tenu responsable de toute perte ou dommage résultant de votre non-respect de cette obligation de sécurité.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">4. Propriété Intellectuelle</h2>
            <p className="text-sm leading-relaxed">
              Le Service, y compris son code source, son design, ses fonctionnalités et son contenu, est la propriété exclusive de GaragePro et est protégé par les lois sur le droit d'auteur et la propriété intellectuelle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">5. Limitation de Responsabilité</h2>
            <p className="text-sm leading-relaxed">
              Dans toute la mesure permise par la loi, GaragePro ne sera pas responsable des dommages indirects, accessoires, spéciaux ou consécutifs, y compris, mais sans s'y limiter, la perte de profits, de données ou d'utilisation, résultant de votre utilisation du Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">6. Résiliation</h2>
            <p className="text-sm leading-relaxed">
              Nous pouvons suspendre ou résilier votre accès au Service immédiatement, sans préavis ni responsabilité, pour quelque raison que ce soit, y compris, sans s'y limiter, si vous ne respectez pas les présentes CGU.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">7. Contact</h2>
            <p className="text-sm leading-relaxed">
              Pour toute question concernant ces conditions, veuillez nous contacter à : <strong>ishlem.pro@gmail.com</strong>
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

export default TermsOfService;
