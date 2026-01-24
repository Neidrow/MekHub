
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
    nom: '', siret: '', adresse: '', telephone: '', email: '', tva: 20.00, 
    tva_intracom: '', conditions_paiement: 'Paiement à réception', penalites_retard: 'Taux légal en vigueur (3 fois le taux d\'intérêt légal)', validite_devis: 30,
    logo_url: '', google_calendar_enabled: false
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
        alert("Agenda connecté avec succès !");
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

  const handleTvaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, tva: value === '' ? undefined : parseFloat(value) });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-black text-[#1e293b] dark:text-white tracking-tight">Paramètres de l'Atelier</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Configurez l'identité visuelle, la fiscalité et les mentions légales.</p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 lg:p-12 space-y-8">
        <h4 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          Services Connectés
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div id="tour-google-sync" className="flex flex-col justify-between p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 gap-4 h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c3.11 0 5.72-1.03 7.63-2.79l-3.57-2.77c-1 .67-2.28 1.07-4.06 1.07-3.12 0-5.76-2.11-6.71-4.94H1.71v2.86C3.61 20.31 7.55 23 12 23z"/><path fill="#FBBC05" d="M5.29 13.57c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.13H1.71C.62 8.28 0 10.72 0 13.29s.62 5.01 1.71 7.16l3.58-2.86c-.95-2.83-.95-5.96 0-8.02z"/><path fill="#EA4335" d="M12 4.75c1.69 0 3.21.58 4.41 1.72l3.31-3.31C17.71 1.05 15.11 0 12 0 7.55 0 3.61 2.69 1.71 6.13l3.58 2.86c.95-2.83 3.59-4.94 6.71-4.94z"/></svg>
              </div>
              <div><p className="font-black text-slate-800 dark:text-white">Google Calendar</p><p className="text-xs font-bold text-slate-500 dark:text-slate-400">Sync. automatique des RDV</p></div>
            </div>
            <div className="space-y-3 pt-2">
                <button onClick={handleGoogleToggle} disabled={syncLoading} className={`w-full px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${formData.google_calendar_enabled ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-600' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'}`}>
                {syncLoading ? (<div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>) : formData.google_calendar_enabled ? ("Déconnecter l'agenda") : ("Connecter l'agenda")}
                </button>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 lg:p-12 space-y-8">
          <div id="tour-logo-upload" className="flex flex-col md:flex-row items-center gap-8 pb-8 border-b border-slate-50 dark:border-slate-800">
            <div className="shrink-0 relative group">
              <div onClick={triggerFileInput} className="w-24 h-24 rounded-[2rem] overflow-hidden shadow-lg border-2 border-slate-100 dark:border-slate-700 cursor-pointer group-hover:border-blue-500 transition-all relative">
                {formData.logo_url ? (<img src={formData.logo_url} alt="Aperçu" className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 00-2-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>)}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg, image/jpg" className="hidden" />
            </div>
            <div className="flex-1 w-full space-y-2 text-center md:text-left"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Logo de l'atelier</label><div className="flex flex-col md:flex-row gap-3"><button type="button" onClick={triggerFileInput} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm flex items-center justify-center gap-2">Importer une photo</button></div></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nom commercial</label><input required type="text" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/10" /></div>
            <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Numéro SIRET</label><input required type="text" value={formData.siret} onChange={e => setFormData({...formData, siret: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/10" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Adresse de l'établissement</label><input required type="text" value={formData.adresse} onChange={e => setFormData({...formData, adresse: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/10" /></div>
            <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label><input required type="text" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/10" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email</label><input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/10" /></div>
          </div>

          <div id="tour-vat-config" className="pt-8 pb-4 border-t border-slate-100 dark:border-slate-800">
             <h4 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 mb-6">
               <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
               Mentions Légales & Facturation
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Taux de TVA (%)</label><input required type="number" step="0.1" min="0" value={formData.tva === undefined ? '' : formData.tva} onChange={handleTvaChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/10" /><p className="text-[10px] text-slate-400 font-medium ml-1">Mettre 0 pour Micro-entreprise (art. 293B CGI).</p></div>
                <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">N° TVA Intracommunautaire</label><input type="text" placeholder="FRXX XXXXXXXX" value={formData.tva_intracom || ''} onChange={e => setFormData({...formData, tva_intracom: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/10" /></div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Validité des devis (Jours)</label><input type="number" min="1" value={formData.validite_devis || 30} onChange={e => setFormData({...formData, validite_devis: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/10" /></div>
                <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Conditions de Paiement</label><input type="text" placeholder="Ex: Paiement à réception" value={formData.conditions_paiement || ''} onChange={e => setFormData({...formData, conditions_paiement: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/10" /></div>
             </div>
             <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Pénalités de retard (Texte légal)</label><textarea value={formData.penalites_retard || ''} onChange={e => setFormData({...formData, penalites_retard: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-medium text-sm h-24 text-slate-700 dark:text-slate-200" placeholder="Ex: Taux légal en vigueur (3 fois le taux d'intérêt légal). Indemnité forfaitaire pour frais de recouvrement : 40€." /></div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-800">
            {success && <div className="text-emerald-600 font-bold animate-in fade-in">Mise à jour effectuée !</div>}
            <button disabled={loading} type="submit" className="ml-auto px-10 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-3 disabled:opacity-50 active:scale-95">{loading ? "..." : "Enregistrer les modifications"}</button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Settings;
