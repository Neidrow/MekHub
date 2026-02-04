
import React, { useState } from 'react';

interface GoogleCalendarModalProps {
  onConnect: () => Promise<void>;
  onRemindLater: () => void;
  onDismissForever: () => Promise<void>;
}

const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({ onConnect, onRemindLater, onDismissForever }) => {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    await onConnect();
    setLoading(false);
  };

  const handleDismiss = async () => {
    setLoading(true);
    await onDismissForever();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-500 overflow-y-auto">
      <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in duration-300 my-auto">
        {/* Bande décorative Google */}
        <div className="h-2 flex w-full">
          <div className="flex-1 bg-[#4285F4]"></div>
          <div className="flex-1 bg-[#EA4335]"></div>
          <div className="flex-1 bg-[#FBBC05]"></div>
          <div className="flex-1 bg-[#34A853]"></div>
        </div>

        <div className="p-8 lg:p-12 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <svg className="w-10 h-10" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
          </div>

          <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-3">
            Synchronisez votre Agenda
          </h2>
          <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">
            Retrouvez tous vos rendez-vous clients directement sur votre <span className="font-bold text-slate-900">Google Agenda</span>.
          </p>

          <div className="space-y-3">
            <button 
              onClick={handleConnect}
              disabled={loading}
              className="w-full py-4 bg-[#4285F4] text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-[#357ae8] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5 bg-white p-0.5 rounded" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c3.11 0 5.72-1.03 7.63-2.79l-3.57-2.77c-1 .67-2.28 1.07-4.06 1.07-3.12 0-5.76-2.11-6.71-4.94H1.71v2.86C3.61 20.31 7.55 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.29 13.57c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.13H1.71C.62 8.28 0 10.72 0 13.29s.62 5.01 1.71 7.16l3.58-2.86c-.95-2.83-.95-5.96 0-8.02z"/>
                    <path fill="#EA4335" d="M12 4.75c1.69 0 3.21.58 4.41 1.72l3.31-3.31C17.71 1.05 15.11 0 12 0 7.55 0 3.61 2.69 1.71 6.13l3.58 2.86c.95-2.83 3.59-4.94 6.71-4.94z"/>
                  </svg>
                  Connecter maintenant
                </>
              )}
            </button>
            
            <button 
              onClick={onRemindLater}
              disabled={loading}
              className="w-full py-3.5 bg-slate-50 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all text-xs uppercase tracking-widest border border-slate-100"
            >
              Plus tard
            </button>

            <div className="pt-2">
                <button 
                onClick={handleDismiss}
                disabled={loading}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:underline transition-colors"
                >
                Ne plus me demander
                </button>
            </div>
          </div>

          {/* Aide Contextuelle pour l'écran "Non validé" */}
          <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100/50 text-left relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 opacity-10">
                <svg className="w-16 h-16 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
             </div>
             <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
               Message "Application non validée" ?
             </p>
             <p className="text-[11px] text-amber-800/80 leading-relaxed font-medium relative z-10">
               C'est normal durant la phase de certification Google. Pour continuer :
             </p>
             <ol className="list-decimal pl-4 mt-1.5 space-y-1 text-[10px] text-amber-900 font-bold relative z-10">
                <li>Cliquez sur le lien <span className="underline">Paramètres avancés</span> (en bas à gauche).</li>
                <li>Puis sur <span className="underline">Accéder à garage-pro-eight.vercel.app (non sécurisé)</span>.</li>
             </ol>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarModal;
