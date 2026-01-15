
import React, { useState, useEffect } from 'react';
import { getDiagnosticSuggestions, generateCustomerMessage } from '../services/aiService';
import { api } from '../services/api';
import { UserRole } from '../types';

interface AIAssistantProps {
  userId: string;
  userRole: UserRole;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ userId, userRole }) => {
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'diagnostic' | 'message'>('diagnostic');
  const [error, setError] = useState<string | null>(null);

  const [messagePrompt, setMessagePrompt] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [generatedMsg, setGeneratedMsg] = useState('');

  // States pour le compteur
  const [usageCount, setUsageCount] = useState(0);
  const [usageLoading, setUsageLoading] = useState(true);

  const isPremium = userRole === 'user_premium' || userRole === 'super_admin';
  const limit = isPremium ? 100 : 10;

  // Charger le quota au montage
  useEffect(() => {
    refreshUsage();
  }, [userId]);

  const refreshUsage = async () => {
    try {
      const count = await api.getAiUsageCount(userId);
      setUsageCount(count);
    } catch (e) {
      console.error(e);
    } finally {
      setUsageLoading(false);
    }
  };

  const handleDiagnose = async () => {
    if (!symptoms) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getDiagnosticSuggestions(symptoms, userId, userRole);
      setDiagnosis(result);
      await refreshUsage(); // Mise à jour du compteur
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMessage = async () => {
    if (!messagePrompt || !customerName) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateCustomerMessage(messagePrompt, customerName, userId, userRole);
      setGeneratedMsg(result);
      await refreshUsage(); // Mise à jour du compteur
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const remaining = Math.max(0, limit - usageCount);
  const progressPercent = Math.min((usageCount / limit) * 100, 100);
  
  // Couleur de la barre : Vert -> Orange -> Rouge
  let progressColor = 'bg-emerald-500';
  if (progressPercent > 60) progressColor = 'bg-amber-500';
  if (progressPercent > 90) progressColor = 'bg-rose-500';

  return (
    <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER AVEC JAUGE DE QUOTA */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-widest">Assistant Intelligent Actif</span>
           </div>
           <h2 className="text-2xl font-black text-slate-800">Expertise & Communication</h2>
           <p className="text-slate-500 text-sm mt-1">Optimisez votre atelier grâce au moteur de diagnostic intégré.</p>
        </div>

        <div className="w-full sm:w-64 bg-slate-50 rounded-2xl p-4 border border-slate-100">
           <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quota horaire</span>
              <span className={`text-xs font-black ${remaining === 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                {usageLoading ? '...' : `${remaining} restants`}
              </span>
           </div>
           <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${progressColor}`} 
                style={{ width: `${progressPercent}%` }}
              ></div>
           </div>
           <div className="mt-2 text-right">
              {isPremium ? (
                 <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase">Premium (100/h)</span>
              ) : (
                 <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase">Basic (10/h)</span>
              )}
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl lg:rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('diagnostic')}
            className={`flex-1 py-4 text-xs lg:text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'diagnostic' ? 'text-blue-600 bg-blue-50/50 border-b-2 lg:border-b-4 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Diagnostic Prédictif
          </button>
          <button 
            onClick={() => setActiveTab('message')}
            className={`flex-1 py-4 text-xs lg:text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'message' ? 'text-blue-600 bg-blue-50/50 border-b-2 lg:border-b-4 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Assistant Message
          </button>
        </div>

        <div className="p-6 lg:p-8">
          {error && (
             <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-pulse">
                <svg className="w-6 h-6 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p className="text-xs font-bold text-rose-600">{error}</p>
             </div>
          )}

          {activeTab === 'diagnostic' ? (
            <div className="space-y-6">
              
              {/* DISCLAIMER IA */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 items-start">
                <div className="text-amber-500 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                  <p className="text-xs font-black text-amber-800 uppercase tracking-wide mb-1">Avertissement Important</p>
                  <p className="text-xs text-amber-700 leading-relaxed font-medium">
                    Les résultats fournis par cette Intelligence Artificielle sont des <strong>hypothèses techniques</strong> basées sur les symptômes décrits. Ils ne constituent pas une certitude absolue et ne remplacent en aucun cas un diagnostic physique réalisé par un professionnel qualifié.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Symptômes du véhicule</label>
                <textarea 
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Ex: Bruit de claquement à l'avant gauche, fumée bleue à l'accélération..."
                  className="w-full h-40 lg:h-32 p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                />
                <p className="text-right text-[10px] text-slate-400 mt-1 font-bold">{symptoms.trim().split(/\s+/).filter(w => w).length} / 1200 mots</p>
              </div>
              <button 
                onClick={handleDiagnose}
                disabled={loading || !symptoms || remaining <= 0}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : remaining <= 0 ? (
                  "Quota atteint pour cette heure"
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Analyser les symptômes
                  </>
                )}
              </button>

              {diagnosis && (
                <div className="mt-8 p-6 lg:p-10 bg-slate-50 rounded-[2rem] border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-inner">
                  <div className="prose prose-slate prose-sm lg:prose-base max-w-none text-slate-700 whitespace-pre-line leading-relaxed font-medium font-mono text-[13px]">
                    {diagnosis}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Client</label>
                  <input 
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="M. Martin"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Statut travaux</label>
                  <input 
                    type="text"
                    value={messagePrompt}
                    onChange={(e) => setMessagePrompt(e.target.value)}
                    placeholder="Freins changés, prêt à 17h"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold"
                  />
                </div>
              </div>
              <button 
                onClick={handleGenerateMessage}
                disabled={loading || !customerName || !messagePrompt || remaining <= 0}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all text-sm uppercase tracking-widest disabled:opacity-50"
              >
                {remaining <= 0 ? "Quota atteint" : "Générer le SMS"}
              </button>

              {generatedMsg && (
                <div className="mt-8 p-6 lg:p-8 bg-blue-50/50 rounded-[2rem] border border-blue-100 animate-in fade-in duration-500">
                  <div className="p-6 bg-white rounded-2xl border border-blue-100 text-slate-700 font-bold text-sm lg:text-base italic leading-relaxed shadow-sm">
                    "{generatedMsg}"
                  </div>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(generatedMsg); alert('Copié !'); }}
                    className="mt-4 px-6 py-3 bg-white border border-blue-200 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-50 transition-all shadow-sm"
                  >
                    Copier le message
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
