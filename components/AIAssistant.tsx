
import React, { useState } from 'react';
import { getDiagnosticSuggestions, generateCustomerMessage } from '../services/aiService';

const AIAssistant: React.FC = () => {
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'diagnostic' | 'message'>('diagnostic');

  const [messagePrompt, setMessagePrompt] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [generatedMsg, setGeneratedMsg] = useState('');

  const handleDiagnose = async () => {
    if (!symptoms) return;
    setLoading(true);
    const result = await getDiagnosticSuggestions(symptoms);
    setDiagnosis(result);
    setLoading(false);
  };

  const handleGenerateMessage = async () => {
    if (!messagePrompt || !customerName) return;
    setLoading(true);
    const result = await generateCustomerMessage(messagePrompt, customerName);
    setGeneratedMsg(result);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <div className="text-center px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full mb-4">
           <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
           <span className="text-[10px] font-black uppercase tracking-widest">Assistant Intelligent Actif</span>
        </div>
        <h2 className="text-2xl lg:text-3xl font-black text-slate-800">Expertise & Communication</h2>
        <p className="text-slate-500 text-sm lg:text-base mt-2">Optimisez votre atelier grâce au moteur de diagnostic intégré.</p>
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
          {activeTab === 'diagnostic' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Symptômes du véhicule</label>
                <textarea 
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Ex: Bruit de claquement à l'avant gauche, fumée bleue à l'accélération..."
                  className="w-full h-40 lg:h-32 p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                />
              </div>
              <button 
                onClick={handleDiagnose}
                disabled={loading || !symptoms}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                )}
                Analyser les symptômes
              </button>

              {diagnosis && (
                <div className="mt-8 p-6 lg:p-10 bg-slate-50 rounded-[2rem] border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="prose prose-slate prose-sm lg:prose-base max-w-none text-slate-700 whitespace-pre-line leading-relaxed font-medium">
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
                disabled={loading || !customerName || !messagePrompt}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all text-sm uppercase tracking-widest"
              >
                Générer le SMS
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
