
import React, { useState } from 'react';
import { getDiagnosticSuggestions, generateCustomerMessage } from '../services/geminiService';

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
        <h2 className="text-2xl lg:text-3xl font-black text-slate-800">Assistant IA</h2>
        <p className="text-slate-500 text-sm lg:text-base mt-2">Optimisez votre atelier grâce à l'intelligence artificielle Gemini</p>
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
            Assistant Communication
          </button>
        </div>

        <div className="p-6 lg:p-8">
          {activeTab === 'diagnostic' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Symptômes observés</label>
                <textarea 
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Ex: Tremblements à l'accélération, voyant moteur orange allumé, bruit de claquement à froid..."
                  className="w-full h-40 lg:h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm"
                />
              </div>
              <button 
                onClick={handleDiagnose}
                disabled={loading || !symptoms}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                )}
                Lancer l'Analyse Gemini
              </button>

              {diagnosis && (
                <div className="mt-8 p-6 lg:p-8 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h4 className="text-[10px] lg:text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Recommandations de l'IA
                  </h4>
                  <div className="prose prose-slate prose-sm lg:prose-base max-w-none text-slate-700 whitespace-pre-line leading-relaxed font-medium">
                    {diagnosis}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Nom du Client</label>
                  <input 
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Détails de l'intervention</label>
                  <input 
                    type="text"
                    value={messagePrompt}
                    onChange={(e) => setMessagePrompt(e.target.value)}
                    placeholder="Ex: Kit de distribution remplacé, voiture prête"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>
              <button 
                onClick={handleGenerateMessage}
                disabled={loading || !customerName || !messagePrompt}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all text-sm uppercase tracking-widest"
              >
                Générer la communication
              </button>

              {generatedMsg && (
                <div className="mt-8 p-6 lg:p-8 bg-blue-50/50 rounded-2xl border border-blue-100 animate-in fade-in duration-500">
                  <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-[0.2em] mb-4">Aperçu du message généré</h4>
                  <div className="p-5 lg:p-6 bg-white rounded-xl lg:rounded-2xl border border-blue-100 text-slate-700 font-medium text-sm lg:text-base italic leading-relaxed">
                    "{generatedMsg}"
                  </div>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(generatedMsg); }}
                    className="mt-4 px-6 py-2.5 bg-blue-600 text-white text-[10px] lg:text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                  >
                    Copier dans le presse-papier
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
