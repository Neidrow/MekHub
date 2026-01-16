
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { generateQuotePDF } from '../services/pdfService';
import { Devis, Client, Vehicule, GarageSettings } from '../types';

interface PublicQuoteViewProps {
  quoteId: string;
}

const PublicQuoteView: React.FC<PublicQuoteViewProps> = ({ quoteId }) => {
  const [data, setData] = useState<{ devis: Devis; client: Client; vehicule: Vehicule; settings: GarageSettings } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Signature States
  const [signName, setSignName] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [signLoading, setSignLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await api.fetchPublicQuote(quoteId);
        setData(result);
      } catch (err: any) {
        setError(err.message || "Impossible de charger le devis. Le lien est peut-être invalide ou expiré.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quoteId]);

  const handleSign = async (action: 'accepte' | 'refuse') => {
    if (action === 'accepte') {
      if (!signName.trim() || !consentChecked) {
        alert("Veuillez saisir votre nom et cocher la case de consentement.");
        return;
      }
    } else {
        if (!confirm("Êtes-vous sûr de vouloir refuser ce devis ?")) return;
    }

    setSignLoading(true);
    try {
      const metadata = {
        signed_by: action === 'accepte' ? signName : 'Refusé',
        signed_at: new Date().toISOString(),
        ip_address: 'IP_NOT_CAPTURED_CLIENT_SIDE',
        user_agent: navigator.userAgent,
        consent_text: action === 'accepte' ? "Lu et approuvé. Bon pour accord." : "Devis refusé."
      };

      await api.signQuote(quoteId, metadata, action);
      setSuccess(true);
      // Mise à jour immédiate des données locales pour que le bouton de téléchargement inclue la signature
      if (data) {
          setData({ ...data, devis: { ...data.devis, statut: action, signature_metadata: metadata } });
      }
    } catch (err: any) {
      alert("Erreur lors de la signature : " + err.message);
    } finally {
      setSignLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!data) return;
    const doc = generateQuotePDF(data.devis, data.client, data.vehicule, data.settings);
    doc.save(`Devis_${data.devis.numero_devis}.pdf`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>;
  if (error || !data) return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 text-center"><h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Oups !</h1><p className="text-slate-500 dark:text-slate-400">{error}</p></div>;

  const { devis, client, vehicule, settings } = data;
  const isProcessed = devis.statut === 'accepte' || devis.statut === 'refuse';

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#0f172a] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* --- EN-TÊTE DU DOCUMENT --- */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-8 sm:p-12 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
           <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
              <div>
                 {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="w-20 h-20 object-cover rounded-2xl mb-4 bg-white" />}
                 <h1 className="text-3xl font-black tracking-tight">{settings.nom}</h1>
                 <p className="text-slate-400 text-sm mt-2 max-w-xs whitespace-pre-line">{settings.adresse}</p>
                 <p className="text-slate-400 text-sm mt-1">{settings.telephone} | {settings.email}</p>
                 <p className="text-slate-500 text-xs mt-1">SIRET: {settings.siret}</p>
              </div>
              <div className="text-right flex flex-col items-end">
                 <div className="inline-block px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 mb-4">
                    <span className="text-xs font-black uppercase tracking-widest text-blue-300">Devis N°</span>
                    <p className="text-2xl font-black">{devis.numero_devis}</p>
                 </div>
                 <p className="text-sm text-slate-400">Date d'émission : {new Date(devis.date_devis).toLocaleDateString()}</p>
                 <p className="text-sm text-slate-400 mt-1">Valable jusqu'au : {new Date(new Date(devis.date_devis).setDate(new Date(devis.date_devis).getDate() + (settings.validite_devis || 30))).toLocaleDateString()}</p>
                 
                 {/* Bouton Téléchargement Header */}
                 <button 
                    onClick={downloadPDF}
                    className="mt-6 px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2 shadow-lg"
                 >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Télécharger le PDF
                 </button>
              </div>
           </div>
        </div>

        {/* --- INFO CLIENT & VEHICULE --- */}
        <div className="p-8 sm:p-12 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100 dark:border-slate-800">
           <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Client</h3>
              <p className="text-lg font-black text-slate-800 dark:text-white">{client.nom} {client.prenom}</p>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">{client.adresse}</p>
              <p className="text-slate-600 dark:text-slate-300 text-sm">{client.telephone}</p>
              <p className="text-slate-600 dark:text-slate-300 text-sm">{client.email}</p>
           </div>
           <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Véhicule</h3>
              <p className="text-lg font-black text-slate-800 dark:text-white">{vehicule.marque} {vehicule.modele}</p>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1 font-mono bg-white dark:bg-slate-900 inline-block px-2 py-1 rounded border border-slate-200 dark:border-slate-700">{vehicule.immatriculation}</p>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-2">{vehicule.kilometrage} km • {vehicule.annee}</p>
           </div>
        </div>

        {/* --- TABLEAU PRESTATIONS --- */}
        <div className="p-8 sm:p-12">
           <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    <tr>
                       <th className="px-6 py-4">Description</th>
                       <th className="px-6 py-4 text-center">Qté</th>
                       <th className="px-6 py-4 text-right">P.U. HT</th>
                       <th className="px-6 py-4 text-right">Total HT</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {devis.items.map((item, idx) => (
                       <tr key={idx} className="bg-white dark:bg-slate-900">
                          <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200 text-sm">{item.description}</td>
                          <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400 text-sm">{item.quantity}</td>
                          <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400 text-sm">{item.unitPrice.toFixed(2)} €</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-white text-sm">{item.total.toFixed(2)} €</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           {/* TOTAUX */}
           <div className="flex justify-end mt-8">
              <div className="w-full sm:w-72 bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl space-y-3">
                 <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>Total HT</span>
                    <span className="font-bold">{devis.montant_ht.toFixed(2)} €</span>
                 </div>
                 <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>TVA</span>
                    <span className="font-bold">{(devis.montant_ttc - devis.montant_ht).toFixed(2)} €</span>
                 </div>
                 <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-xl font-black text-slate-900 dark:text-white">
                    <span>Total TTC</span>
                    <span>{devis.montant_ttc.toFixed(2)} €</span>
                 </div>
              </div>
           </div>
        </div>

        {/* --- ZONE D'ACTION / SIGNATURE --- */}
        <div className="bg-slate-100 dark:bg-slate-950 p-8 sm:p-12 border-t border-slate-200 dark:border-slate-800">
           {isProcessed ? (
              <div className={`text-center p-8 rounded-[2rem] border-2 ${devis.statut === 'accepte' ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/50 dark:text-emerald-300' : 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-900/20 dark:border-rose-900/50 dark:text-rose-300'}`}>
                 <div className="text-4xl mb-4">{devis.statut === 'accepte' ? '✅' : '❌'}</div>
                 <h2 className="text-2xl font-black mb-2">{devis.statut === 'accepte' ? 'Devis Accepté' : 'Devis Refusé'}</h2>
                 {devis.signature_metadata && (
                    <div className="text-xs opacity-75 mt-4 space-y-1 font-mono">
                       <p>Signé par : {devis.signature_metadata.signed_by}</p>
                       <p>Date : {new Date(devis.signature_metadata.signed_at).toLocaleString()}</p>
                       <p>Preuve numérique : {devis.signature_metadata.user_agent.substring(0, 50)}...</p>
                    </div>
                 )}
                 <button onClick={downloadPDF} className="mt-6 px-8 py-3 bg-white border border-black/10 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-transform text-slate-800">
                    Télécharger la copie signée
                 </button>
              </div>
           ) : (
              <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-800">
                 <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">Validation du devis</h3>
                 
                 <div className="space-y-4 mb-8">
                    <div>
                       <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Votre Nom et Prénom</label>
                       <input 
                          type="text" 
                          value={signName}
                          onChange={(e) => setSignName(e.target.value)}
                          placeholder="Tapez votre nom pour signer..."
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                       />
                    </div>
                    
                    <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                       <input 
                          type="checkbox" 
                          checked={consentChecked}
                          onChange={(e) => setConsentChecked(e.target.checked)}
                          className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                       />
                       <span className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                          Je reconnais avoir pris connaissance des conditions générales et j'accepte ce devis sans réserve. Cette action vaut signature électronique (Art. 1367 du Code Civil).
                       </span>
                    </label>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <button 
                       onClick={() => handleSign('refuse')}
                       disabled={signLoading}
                       className="py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-rose-500 transition-all text-xs uppercase tracking-widest"
                    >
                       Refuser
                    </button>
                    <button 
                       onClick={() => handleSign('accepte')}
                       disabled={signLoading || !consentChecked || !signName}
                       className="py-4 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest"
                    >
                       {signLoading ? 'Signature...' : 'Signer & Accepter'}
                    </button>
                 </div>
              </div>
           )}
        </div>

        {/* FOOTER LEGAL */}
        <div className="p-6 text-center bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-2">
           <div className="mb-4 text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p><span className="font-bold">Conditions de paiement :</span> {settings.conditions_paiement || "Paiement à réception"}</p>
              <p><span className="font-bold">Pénalités de retard :</span> {settings.penalites_retard || "Taux légal en vigueur"}</p>
           </div>
           <p className="text-[10px] text-slate-400">
              Document généré électroniquement via GaragePro SaaS. 
              {settings.tva_intracom && ` | TVA Intra: ${settings.tva_intracom}`}
           </p>
        </div>

      </div>
    </div>
  );
};

export default PublicQuoteView;
