
import React, { useState, useEffect, useRef } from 'react';
import { GarageSettings } from '../types';
import { api } from '../services/api';

interface SettingsProps {
  initialSettings: GarageSettings | null;
  onSave: (settings: Partial<GarageSettings>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ initialSettings, onSave, onRefresh }) => {
  const [formData, setFormData] = useState<Partial<GarageSettings>>({
    nom: '', siret: '', adresse: '', telephone: '', email: '', tva: 20.00, logo_url: '', google_calendar_enabled: false
  });
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialSettings) setFormData(initialSettings);
  }, [initialSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      await onSave(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(`Erreur d'enregistrement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncLoading(true);
    try {
      const count = await api.syncAllUpcomingToGoogle();
      await onRefresh(); // Rafraîchir les badges "Google OK"
      alert(`${count} rendez-vous ont été synchronisés avec Google Calendar.`);
    } catch (err: any) {
      alert(`La synchronisation a échoué : ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleGoogleToggle = async () => {
    setSyncLoading(true);
    try {
      if (!formData.google_calendar_enabled) {
        await api.requestGoogleAccess();
        const updated = { ...formData, google_calendar_enabled: true };
        setFormData(updated);
        await onSave(updated);
        await api.syncAllUpcomingToGoogle();
        await onRefresh();
        alert("Agenda connecté et synchronisé !");
      } else {
        const updated = { ...formData, google_calendar_enabled: false };
        setFormData(updated);
        await onSave(updated);
        await onRefresh();
      }
    } catch (err: any) {
      alert(`Action Google Calendar impossible : ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limite de taille simple (ex: 2MB) pour ne pas surcharger la base de données
      if (file.size > 2 * 1024 * 1024) {
        alert("L'image est trop volumineuse. Veuillez choisir une image de moins de 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({ ...formData, logo_url: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-black text-[#1e293b] tracking-tight">Paramètres de l'Atelier</h3>
          <p className="text-slate-500 mt-2 font-medium">Configurez l'identité visuelle et les intégrations de votre garage.</p>
        </div>
      </div>
      
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 lg:p-12 space-y-6">
        <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          Intégrations & Services
        </h4>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c3.11 0 5.72-1.03 7.63-2.79l-3.57-2.77c-1 .67-2.28 1.07-4.06 1.07-3.12 0-5.76-2.11-6.71-4.94H1.71v2.86C3.61 20.31 7.55 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.29 13.57c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.13H1.71C.62 8.28 0 10.72 0 13.29s.62 5.01 1.71 7.16l3.58-2.86c-.95-2.83-.95-5.96 0-8.02z"/>
                  <path fill="#EA4335" d="M12 4.75c1.69 0 3.21.58 4.41 1.72l3.31-3.31C17.71 1.05 15.11 0 12 0 7.55 0 3.61 2.69 1.71 6.13l3.58 2.86c.95-2.83 3.59-4.94 6.71-4.94z"/>
                </svg>
              </div>
              <div>
                <p className="font-black text-slate-800">Google Calendar</p>
                <p className="text-xs font-bold text-slate-500">Synchronisation automatique des rendez-vous</p>
              </div>
            </div>
            <button 
              onClick={handleGoogleToggle}
              disabled={syncLoading}
              className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${formData.google_calendar_enabled ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'}`}
            >
              {syncLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : formData.google_calendar_enabled ? (
                "Déconnecter"
              ) : (
                "Connecter mon agenda"
              )}
            </button>
          </div>

          {formData.google_calendar_enabled && (
            <div className="flex justify-end pr-4">
              <button 
                onClick={handleManualSync}
                disabled={syncLoading}
                className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <svg className={`w-3 h-3 ${syncLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Synchroniser manuellement mes rendez-vous
              </button>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 lg:p-12 space-y-8">
          
          {/* Section Identité Visuelle avec Upload */}
          <div className="flex flex-col md:flex-row items-center gap-8 pb-8 border-b border-slate-50">
            <div className="shrink-0 relative group">
              <div 
                onClick={triggerFileInput} 
                className="w-24 h-24 rounded-[2rem] overflow-hidden shadow-lg border-2 border-slate-100 cursor-pointer group-hover:border-blue-500 transition-all relative"
              >
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Aperçu" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              </div>
              {/* Input caché pour le fichier */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/png, image/jpeg, image/jpg" 
                className="hidden" 
              />
            </div>
            
            <div className="flex-1 w-full space-y-2 text-center md:text-left">
               <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Logo de l'atelier</label>
               <div className="flex flex-col md:flex-row gap-3">
                 <button 
                    type="button" 
                    onClick={triggerFileInput}
                    className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm flex items-center justify-center gap-2"
                 >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Importer une photo
                 </button>
                 {formData.logo_url && (
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, logo_url: ''})}
                      className="px-6 py-3 bg-white border border-rose-100 text-rose-500 font-bold rounded-xl hover:bg-rose-50 transition-all text-sm"
                    >
                      Supprimer
                    </button>
                 )}
               </div>
               <p className="text-[10px] text-slate-400 font-medium pl-1">Format supporté : PNG, JPG. Max 2 Mo. L'image est sauvegardée automatiquement.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nom commercial</label>
              <input type="text" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} placeholder="Ex: Garage du Centre" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Numéro SIRET</label>
              <input type="text" value={formData.siret} onChange={e => setFormData({...formData, siret: e.target.value})} placeholder="801 456 789 00012" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Adresse de l'établissement</label>
            <input type="text" value={formData.adresse} onChange={e => setFormData({...formData, adresse: e.target.value})} placeholder="Numéro, Rue, Code Postal, Ville" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
              <input type="text" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-6 border-t border-slate-50">
            {success && <div className="text-emerald-600 font-bold animate-in fade-in">Mise à jour effectuée !</div>}
            <button disabled={loading} type="submit" className="ml-auto px-10 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-3 disabled:opacity-50 active:scale-95">
              {loading ? "..." : "Enregistrer les modifications"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Settings;
