
import React, { useState, useEffect } from 'react';
import { getDiagnosticSuggestions, generateCustomerMessage } from '../services/aiService';
import { api } from '../services/api';
import { UserRole, Client } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AIAssistantProps {
  userId: string;
  userRole: UserRole;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ userId, userRole }) => {
  const { t } = useLanguage();
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
  const [clients, setClients] = useState<Client[]>([]);

  const isPremium = userRole === 'user_premium' || userRole === 'super_admin';
  const limit = isPremium ? 100 : 10;

  useEffect(() => { 
      refreshUsage(); 
      loadClients();
  }, [userId]);

  const refreshUsage = async () => { try { const count = await api.getAiUsageCount(userId); setUsageCount(count); } catch (e) { console.error(e); } finally { setUsageLoading(false); } };
  
  const loadClients = async () => {
      try {
          const list = await api.fetchData<Client>('clients');
          setClients(list);
      } catch (e) {
          console.error("Erreur chargement clients pour IA", e);
      }
  };

  const handleDiagnose = async () => { if (!symptoms) return; setLoading(true); setError(null); try { const result = await getDiagnosticSuggestions(symptoms, userId, userRole); setDiagnosis(result); await refreshUsage(); } catch (err: any) { setError(err.message || t('common.error')); } finally { setLoading(false); } };
  
  const handleGenerateMessage = async () => { if (!messagePrompt || !customerName) return; setLoading(true); setError(null); try { const result = await generateCustomerMessage(messagePrompt, customerName, userId, userRole); setGeneratedMsg(result); await refreshUsage(); } catch (err: any) { setError(err.message || t('common.error')); } finally { setLoading(false); } };

  const remaining = Math.max(0, limit - usageCount);
  const progressPercent = Math.min((usageCount / limit) * 100, 100);
  let progressColor = 'bg-emerald-500';
  if (progressPercent > 60) progressColor = 'bg-amber-500';
  if (progressPercent > 90) progressColor = 'bg-rose-500';

  return (
    <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div><div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full mb-2"><div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div><span className="text-[10px] font-black uppercase tracking-widest">{t('ai.active_badge')}</span></div><h2 className="text-2xl font-black text-slate-800 dark:text-white">{t('ai.title')}</h2><p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('ai.subtitle')}</p></div>
        <div id="ai-quota" className="w-full sm:w-64 bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700"><div className="flex justify-between items-end mb-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('ai.quota')}</span><span className={`text-xs font-black ${remaining === 0 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}`}>{usageLoading ? '...' : `${remaining} ${t('ai.remaining')}`}</span></div><div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${progressPercent}%` }}></div></div><div className="mt-2 text-right">{isPremium ? (<span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded uppercase">Premium (100/j)</span>) : (<span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded uppercase">Basic (10/j)</span>)}</div></div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl lg:rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div id="ai-tabs" className="flex flex-col sm:flex-row border-b border-slate-100 dark:border-slate-800"><button onClick={() => setActiveTab('diagnostic')} className={`flex-1 py-4 text-xs lg:text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'diagnostic' ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10 border-b-2 lg:border-b-4 border-blue-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>{t('ai.tab_diag')}</button><button onClick={() => setActiveTab('message')} className={`flex-1 py-4 text-xs lg:text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'message' ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10 border-b-2 lg:border-b-4 border-blue-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>{t('ai.tab_msg')}</button></div>
        <div id="ai-input" className="p-6 lg:p-8">{error && (<div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center gap-3 animate-pulse"><svg className="w-6 h-6 text-rose-500 dark:text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg><p className="text-xs font-bold text-rose-600 dark:text-rose-400">{error}</p></div>)}
          {activeTab === 'diagnostic' ? (<div className="space-y-6"><div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex gap-3 items-start"><div className="text-amber-500 dark:text-amber-400 mt-0.5"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div><div><p className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wide mb-1">{t('ai.warning_title')}</p><p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">{t('ai.warning_text')}</p></div></div><div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t('ai.label_symptoms')}</label><textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder={t('ai.placeholder_symptoms')} className="w-full h-40 lg:h-32 p-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium text-slate-700 dark:text-slate-200" /><p className="text-right text-[10px] text-slate-400 mt-1 font-bold">{symptoms.trim().split(/\s+/).filter(w => w).length} / 1200 mots</p></div><button onClick={handleDiagnose} disabled={loading || !symptoms || remaining <= 0} className="w-full py-5 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-black dark:hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest">{loading ? (<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>) : remaining <= 0 ? ("Quota journalier atteint") : (<><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>{t('ai.btn_analyze')}</>)}</button>{diagnosis && (<div className="mt-8 p-6 lg:p-10 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-inner"><div className="prose prose-slate dark:prose-invert prose-sm lg:prose-base max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-medium font-mono text-[13px]">{diagnosis}</div></div>)}</div>) : (<div className="space-y-6"><div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('ai.label_client')}</label>
                <select 
                    value={clients.find(c => `${c.nom} ${c.prenom}` === customerName)?.id || ''} 
                    onChange={(e) => {
                        const selected = clients.find(c => c.id === e.target.value);
                        setCustomerName(selected ? `${selected.nom} ${selected.prenom}` : '');
                    }}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none"
                >
                    <option value="">{t('common.select')}</option>
                    {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.nom} {client.prenom}</option>
                    ))}
                </select>
            </div>
            <div className="space-y-2"><label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('ai.label_status')}</label><input type="text" value={messagePrompt} onChange={(e) => setMessagePrompt(e.target.value)} placeholder={t('ai.placeholder_status')} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200" /></div></div><button onClick={handleGenerateMessage} disabled={loading || !customerName || !messagePrompt || remaining <= 0} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all text-sm uppercase tracking-widest disabled:opacity-50">{remaining <= 0 ? "Quota atteint" : t('ai.btn_generate')}</button>{generatedMsg && (<div className="mt-8 p-6 lg:p-8 bg-blue-50/50 dark:bg-blue-900/20 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 animate-in fade-in duration-500"><div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-blue-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm lg:text-base italic leading-relaxed shadow-sm">"{generatedMsg}"</div><button onClick={() => { navigator.clipboard.writeText(generatedMsg); alert(t('common.copied')); }} className="mt-4 px-6 py-3 bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-600 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-50 dark:hover:bg-slate-700 transition-all shadow-sm">{t('ai.btn_copy')}</button></div>)}</div>)}
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
