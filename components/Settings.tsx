
import React, { useState, useEffect } from 'react';
import { GarageSettings } from '../types';

interface SettingsProps {
  initialSettings: GarageSettings | null;
  onSave: (settings: Partial<GarageSettings>) => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ initialSettings, onSave }) => {
  const [formData, setFormData] = useState<Partial<GarageSettings>>({
    nom: '',
    siret: '',
    adresse: '',
    telephone: '',
    email: '',
    tva: 20.00,
    logo_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (initialSettings) {
      setFormData(initialSettings);
    }
  }, [initialSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      await onSave(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-black text-[#1e293b] tracking-tight">Paramètres de l'Atelier</h3>
          <p className="text-slate-500 mt-2 font-medium">Configurez l'identité visuelle et légale de votre garage.</p>
        </div>
        {formData.logo_url && (
          <img src={formData.logo_url} alt="Logo" className="w-16 h-16 rounded-2xl border border-slate-100 object-cover shadow-sm" />
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 lg:p-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nom commercial</label>
              <input 
                type="text" 
                value={formData.nom} 
                onChange={e => setFormData({...formData, nom: e.target.value})}
                placeholder="Ex: Garage du Centre"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:font-medium" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Numéro SIRET</label>
              <input 
                type="text" 
                value={formData.siret} 
                onChange={e => setFormData({...formData, siret: e.target.value})}
                placeholder="801 456 789 00012" 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:font-medium" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Adresse de l'établissement</label>
            <input 
              type="text" 
              value={formData.adresse} 
              onChange={e => setFormData({...formData, adresse: e.target.value})}
              placeholder="Numéro, Rue, Code Postal, Ville" 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:font-medium" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone professionel</label>
              <input 
                type="text" 
                value={formData.telephone} 
                onChange={e => setFormData({...formData, telephone: e.target.value})}
                placeholder="01 23 45 67 89" 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:font-medium" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email de contact</label>
              <input 
                type="email" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="contact@votre-garage.fr" 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:font-medium" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
             <div className="md:col-span-1 p-6 bg-blue-50/50 border border-blue-100 rounded-3xl">
                <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-2">TVA (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.tva} 
                  onChange={e => setFormData({...formData, tva: parseFloat(e.target.value)})}
                  className="w-full bg-transparent border-none outline-none font-black text-2xl text-blue-700" 
                />
             </div>
             <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">URL du Logo</label>
                <input 
                  type="text" 
                  value={formData.logo_url} 
                  onChange={e => setFormData({...formData, logo_url: e.target.value})}
                  placeholder="https://votre-site.com/logo.png" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:font-medium" 
                />
             </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-50">
            {success && (
              <div className="flex items-center gap-2 text-emerald-600 font-bold animate-in fade-in slide-in-from-left-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                Mise à jour effectuée !
              </div>
            )}
            <button 
              disabled={loading}
              type="submit" 
              className="ml-auto px-10 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-3 disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : "Enregistrer les modifications"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Settings;
