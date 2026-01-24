
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
  const [usageCount, setUsageCount] = useState(0);
  const [usageLoading, setUsageLoading] = useState(true);

  const isPremium = userRole === 'user_premium' || userRole === 'super_admin';
  const limit = isPremium ? 100 : 10;

  useEffect(() => { refreshUsage(); }, [userId]);
  const refreshUsage = async () => { try { const count = await api.getAiUsageCount(userId); setUsageCount(count); } catch (e) { console.error(e); } finally { setUsageLoading(false); } };

  const handleDiagnose = async () => {
    if (!symptoms) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getDiagnosticSuggestions(symptoms, userId, userRole);
      setDiagnosis(result);
      await refreshUsage();
    } catch (err: any) { setError(err.message || "Erreur inconnue"); }
    finally { setLoading(false); }
  };

  const remaining = Math.max(0, limit - usageCount);
  const progressPercent = Math.min((usageCount / limit) * 100, 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full mb-2"><div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div><span className="text-[10px] font-black uppercase tracking-widest">Assistant Intelligent</span></div>
           <h2 className="text-2xl font-black text-slate-800 dark:text-white">Expertise & Communication</h2>
        </div>
        <div className="w-full sm:w-64 bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
           <div className="flex justify-between items-end mb-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quota horaire</span><span className="text-xs font-black">{usageLoading ? '...' : `${remaining} restants`}</span></div>
           <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl lg:rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          <button onClick={() => setActiveTab('diagnostic')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'diagnostic' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500'}`}>Diagnostic Prédictif</button>
          <button onClick={() => setActiveTab('message')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'message' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500'}`}>Assistant Message</button>
        </div>
        <div id="tour-ai-input" className="p-6 lg:p-8">
          {activeTab === 'diagnostic' ? (
            <div className="space-y-6">
              <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Décrivez les symptômes..." className="w-full h-40 p-5 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none font-medium" />
              <button onClick={handleDiagnose} disabled={loading || !symptoms || remaining <= 0} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl uppercase tracking-widest text-xs">{loading ? "Analyse..." : "Lancer le diagnostic"}</button>
              {diagnosis && <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border whitespace-pre-line leading-relaxed font-mono text-sm">{diagnosis}</div>}
            </div>
          ) : (<div className="p-10 text-center text-slate-400 font-bold italic">Module de message disponible en Premium</div>)}
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
