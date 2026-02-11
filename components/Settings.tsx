
import React, { useState, useEffect, useRef } from 'react';
import { GarageSettings } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

interface SettingsProps {
  initialSettings: GarageSettings | null;
  onSave: (settings: Partial<GarageSettings>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ initialSettings, onSave, onRefresh }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<Partial<GarageSettings>>({
    nom: '', siret: '', adresse: '', telephone: '', email: '', tva: 20.00, 
    tva_intracom: '', conditions_paiement: 'Paiement à réception', penalites_retard: 'Taux légal en vigueur (3 fois le taux d\'intérêt légal)', validite_devis: 30,
    logo_url: '', google_calendar_enabled: false
  });
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialSettings) setFormData(initialSettings);
    // Vérifier si un token valide existe localement
    setHasValidToken(!!api.getStoredGoogleToken());
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
      alert(`${t('common.error')}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleToggle = async () => {
    setSyncLoading(true);
    try {
      // Si l'utilisateur veut se connecter OU se reconnecter (token expiré)
      if (!formData.google_calendar_enabled || !hasValidToken) {
        // ICI : On force le consentement car c'est une action utilisateur explicite
        await api.requestGoogleAccess(true);
        setHasValidToken(true);
        
        const updated = { ...formData, google_calendar_enabled: true };
        setFormData(updated);
        await onSave(updated);
        await api.syncAllUpcomingToGoogle(); 
        await onRefresh();
        alert("Agenda connecté avec succès !");
      } else {
        // Déconnexion explicite
        await api.logout(); // Nettoie le token
        setHasValidToken(false);
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

  // Logique d'affichage du bouton
  const isConnectedAndValid = formData.google_calendar_enabled && hasValidToken;
  const isConnectedButExpired = formData.google_calendar_enabled && !hasValidToken;

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-black text-[#1e293b] dark:text-white tracking-tight">{t('settings.title')}</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">{t('settings.subtitle')}</p>
        </div>
      </div>
      
      {/* --- Section Intégrations --- */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 lg:p-12 space-y-8">
        <h4 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          {t('settings.section_connected')}
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col justify-between p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 gap-4 h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c3.11 0 5.72-1.03 7.63-2.79l-3.57-2.77c-1 .67-2.28 1.07-4.06 1.07-3.12 0-5.76-2.11-6.71-4.94H1.71v2.86C3.61 20.31 7.55 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.29 13.57c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.13H1.71C.62 8.28 0 10.72 0 13.29s.62 5.01 1.71 7.16l3.58-2.86c-.95-2.83-.95-5.96 0-8.02z"/>
                  <path fill="#EA4335" d="M12 4.75c1.69 0 3.21.58 4.41 1.72l3.31-3.31C17.71 1.05 15.11 0 12 0 7.55 0 3.61 2.69 1.71 6.13l3.58 2.86c.95-2.83 3.59-4.94 6.71-4.94z"/>
                </svg>
              </div>
              <div>
                <p className="font-black text-slate-800 dark:text-white">Google Calendar</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Sync. automatique des RDV</p>
              </div>
            </div>
            <div className="space-y-3 pt-2">
                <button 
                onClick={handleGoogleToggle}
                disabled={syncLoading}
                className={`w-full px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${isConnectedAndValid ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-600' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'}`}
                >
                {syncLoading ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : isConnectedAndValid ? (
                    t('settings.btn_disconnect_google')
                ) : isConnectedButExpired ? (
                    "Reconnecter (Expiré)"
                ) : (
                    t('settings.btn_connect_google')
                )}
                </button>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 lg:p-12 space-y-8">
          
          {/* Section Identité Visuelle */}
          <div className="flex flex-col md:flex-row items-center gap-8 pb-8 border-b border-slate-50 dark:border-slate-800">
            <div className="shrink-0 relative group">
              <div 
                onClick={triggerFileInput} 
                className="w-24 h-24 rounded-[2rem] overflow-hidden shadow-lg border-2 border-slate-100 dark:border-slate-700 cursor-pointer group-hover:border-blue-500 transition-all relative"
              >
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Aperçu" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 00-2-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg, image/jpg" className="hidden" />
            </div>
            
            <div className="flex-1 w-full space-y-2 text-center md:text-left">
               <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.label_logo')}</label>
               <div className="flex flex-col md:flex-row gap-3">
                 <button type="button" onClick={triggerFileInput} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm flex items-center justify-center gap-2">
                    {t('settings.btn_upload')}
                 </button>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.label_biz_name')}</label>
              <input required type="text" placeholder="Garage Expert Auto" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.label_siret')}</label>
              <input required type="text" placeholder="123 456 789 00012" value={formData.siret} onChange={e => setFormData({...formData, siret: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.label_address')}</label>
            <input required type="text" placeholder="12 rue de la Mécanique, 75000 Paris" value={formData.adresse} onChange={e => setFormData({...formData, adresse: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.label_phone')}</label>
              <input required type="text" placeholder="01 23 45 67 89" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.label_email')}</label>
              <input required type="email" placeholder="contact@garage.pro" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white" />
            </div>
          </div>
        </div>

        {/* --- Mentions Légales --- */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 lg:p-12 space-y-8">
          <h4 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {t('settings.section_legal')}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.label_vat')}</label>
              <input type="number" step="0.1" placeholder="20.0" value={formData.tva} onChange={handleTvaChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.label_vat_intra')}</label>
              <input type="text" placeholder="FR 12 345678900" value={formData.tva_intracom} onChange={e => setFormData({...formData, tva_intracom: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white" />
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.label_validity')}</label>
             <input type="number" placeholder="30" value={formData.validite_devis} onChange={e => setFormData({...formData, validite_devis: parseInt(e.target.value) || 30})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white" />
          </div>

          <div className="space-y-2">
             <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.label_payment_terms')}</label>
             <input type="text" placeholder="Paiement à réception" value={formData.conditions_paiement} onChange={e => setFormData({...formData, conditions_paiement: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white" />
          </div>

          <div className="space-y-2">
             <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.label_penalties')}</label>
             <textarea placeholder="Taux légal en vigueur..." value={formData.penalites_retard} onChange={e => setFormData({...formData, penalites_retard: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white h-24" />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all text-xs uppercase tracking-widest active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3">
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              {success && <svg className="w-5 h-5 animate-in zoom-in" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
              {success ? t('settings.save_success') : t('settings.btn_save')}
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default Settings;
