
import React, { useState } from 'react';
import { api } from '../services/api';

interface AuthProps {
  onLogin: (session: any) => void;
}

type AuthStep = 'login' | 'signup';

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [step, setStep] = useState<AuthStep>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [garage, setGarage] = useState('');
  const [stayConnected, setStayConnected] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | React.ReactNode>('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await api.login(email, password);
      if (data && data.session) {
        onLogin(data.session);
      }
    } catch (err: any) {
      if (err.message === 'Email not confirmed') {
        setError(
          <div className="text-left space-y-2">
            <p className="font-black text-rose-500">Email non confirmé !</p>
            <p className="text-[10px] leading-relaxed opacity-80">
              Veuillez confirmer votre email ou désactiver la confirmation dans Supabase.
            </p>
          </div>
        );
      } else {
        setError(err.message || "Erreur lors de la connexion.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await api.signup(email, password, garage);
      if (data && data.session) {
        onLogin(data.session);
      } else if (data && data.user) {
        setSuccess("Compte créé ! Vous pouvez maintenant vous connecter.");
        setStep('login');
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden text-white">
      <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md relative animate-in fade-in zoom-in duration-500">
        <div className="bg-slate-900/50 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 lg:p-12 shadow-2xl">
          
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 mb-6 transform -rotate-6 transition-transform hover:rotate-0 duration-500">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.6 2 11.8 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
              </svg>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">GaragePro SaaS</h1>
            <p className="text-slate-400 text-sm font-medium">Gestion d'atelier nouvelle génération</p>
          </div>

          <form onSubmit={step === 'login' ? handleLogin : handleSignup} className="space-y-4 text-left">
            {step === 'signup' && (
              <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Nom de l'atelier</label>
                <input required type="text" placeholder="ex: Garage du Centre" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500 transition-all font-medium placeholder:text-slate-600" value={garage} onChange={e => setGarage(e.target.value)} />
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Email professionnel</label>
              <input required type="email" placeholder="chef@atelier.pro" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500 transition-all font-medium placeholder:text-slate-600" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Mot de passe</label>
              <input required type="password" placeholder="••••••••" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500 transition-all font-medium placeholder:text-slate-600" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {step === 'login' && (
              <div className="flex items-center gap-2 ml-4 mt-2">
                <button 
                  type="button"
                  onClick={() => setStayConnected(!stayConnected)}
                  className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${stayConnected ? 'bg-blue-600 border-blue-600' : 'border-white/20 hover:border-white/40'}`}
                >
                  {stayConnected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                </button>
                <span className="text-xs font-bold text-slate-400 cursor-pointer select-none" onClick={() => setStayConnected(!stayConnected)}>Rester connecté</span>
              </div>
            )}

            {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold text-center animate-shake">{error}</div>}
            {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-bold text-center">{success}</div>}

            <button disabled={loading} type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 mt-6 uppercase tracking-widest text-xs">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (step === 'login' ? "Se connecter" : "Créer mon garage")}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button onClick={() => { setStep(step === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }} className="text-slate-400 text-sm font-bold hover:text-white transition-colors">
              {step === 'login' ? "Pas encore de compte ? S'inscrire" : "Déjà inscrit ? Se connecter"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default Auth;
