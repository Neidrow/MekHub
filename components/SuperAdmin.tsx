
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { UserRole } from '../types';

const SuperAdmin: React.FC = () => {
  const [stats, setStats] = useState({ totalGarages: 0, activeUsers: 0 });
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', role: 'user_basic' as UserRole });
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    setStats({ totalGarages: 8, activeUsers: 14 });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await api.inviteUser(newUser.email, newUser.role);
      
      setInvitedUsers(prev => [
        { email: newUser.email, role: newUser.role, tempPass: result.tempPassword, date: new Date().toLocaleTimeString(), status: 'Email envoyé' },
        ...prev
      ]);

      setMessage({ 
        text: `Succès ! Un email contenant les accès a été envoyé à ${newUser.email}.`, 
        type: 'success' 
      });
      setNewUser({ email: '', role: 'user_basic' });
    } catch (err: any) {
      setMessage({ text: err.message || "Erreur lors de la création ou de l'envoi du mail", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Console SaaS Master</h2>
          <p className="text-slate-500 mt-2 font-medium">Gestion des accès et monétisation de la plateforme.</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenus Mensuels</span>
              <span className="text-2xl font-black text-emerald-600">2 450 €</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-8 lg:p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
          <div>
            <h3 className="text-xl font-black text-slate-800">Ajouter un Garage</h3>
            <p className="text-slate-500 text-sm mt-1">L'utilisateur recevra ses accès par email.</p>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email du gérant</label>
              <input 
                required
                type="email"
                value={newUser.email}
                onChange={e => setNewUser({...newUser, email: e.target.value})}
                placeholder="contact@nouveau-garage.fr"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-bold text-slate-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type d'abonnement</label>
              <div className="grid grid-cols-2 gap-3">
                 <button 
                   type="button"
                   onClick={() => setNewUser({...newUser, role: 'user_basic'})}
                   className={`p-4 rounded-2xl border-2 transition-all text-sm font-black ${newUser.role === 'user_basic' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-slate-100 text-slate-400'}`}
                 >
                   Basic
                 </button>
                 <button 
                   type="button"
                   onClick={() => setNewUser({...newUser, role: 'user_premium'})}
                   className={`p-4 rounded-2xl border-2 transition-all text-sm font-black ${newUser.role === 'user_premium' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400'}`}
                 >
                   Premium
                 </button>
              </div>
            </div>

            {message && (
              <div className={`p-4 rounded-2xl text-xs font-bold animate-in zoom-in duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {message.text}
              </div>
            )}

            <button 
              disabled={loading}
              type="submit"
              className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Générer & Envoyer Email"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-800">Journal des invitations</h3>
            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-lg">SMTP Status</span>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[500px] p-4 space-y-3">
            {invitedUsers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                <p className="font-bold">Aucune activité récente</p>
              </div>
            ) : (
              invitedUsers.map((user, i) => (
                <div key={i} className="p-5 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-between group hover:bg-white hover:shadow-lg hover:border-transparent transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white ${user.role === 'user_premium' ? 'bg-indigo-600' : 'bg-purple-600'}`}>
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{user.email}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-600">{user.status}</span>
                        <span className={`text-[9px] font-black uppercase tracking-tighter text-slate-400`}>
                          • {user.date}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Rôle</p>
                    <span className="text-xs font-black text-slate-900 uppercase">{user.role.replace('user_', '')}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-slate-900 text-slate-400 text-[10px] font-bold text-center uppercase tracking-widest">
            Service de mail opérationnel • Protection SSL
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdmin;
