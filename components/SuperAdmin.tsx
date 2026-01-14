
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { UserRole } from '../types';

const SuperAdmin: React.FC = () => {
  const [stats, setStats] = useState({ totalGarages: 0, revenue: 0 });
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', role: 'user_basic' as UserRole });
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // States pour la suppression
  const [showDeleteModal, setShowDeleteModal] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const history = await api.fetchInvitations();
      setInvitedUsers(history);
      
      setStats({ 
        totalGarages: history.length, 
        revenue: history.reduce((acc, curr) => acc + (curr.role === 'user_premium' ? 49 : 29), 0)
      });
    } catch (err: any) {
      console.error("Erreur SuperAdmin loadData:", err);
      setFetchError(err.message || "Impossible de charger la liste des invitations.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      // Appel à la fonction unifiée qui gère Auth + DB + Email
      await api.inviteUser(newUser.email, newUser.role);
      
      setMessage({ text: `Compte créé avec succès ! Email d'invitation envoyé à ${newUser.email}.`, type: 'success' });
      setNewUser({ email: '', role: 'user_basic' });
      await loadData();
    } catch (err: any) {
      console.error("Erreur création utilisateur:", err);
      // Si l'erreur contient le mot de passe (cas d'échec email), on l'affiche en warning
      if (err.message && err.message.includes('Mdp:')) {
         setMessage({ text: err.message, type: 'warning' });
      } else {
         setMessage({ text: err.message || "Erreur lors de la création du compte", type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (user: any) => {
    const newStatus = user.status === 'Suspendu' ? 'Actif' : 'Suspendu';
    try {
      await api.updateInvitationStatus(user.id, newStatus);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = async () => {
    if (!showDeleteModal) return;
    try {
      await api.deleteGarageAccount(showDeleteModal.id);
      setShowDeleteModal(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Modal de Confirmation de Suppression - Mobile Ready */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setShowDeleteModal(null)}
        >
          <div 
            className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative cursor-default animate-in zoom-in duration-300 flex flex-col max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowDeleteModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shrink-0">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-lg font-black text-slate-800 text-center mb-1 shrink-0">Suppression définitive</h3>
            <p className="text-slate-500 text-center text-xs mb-6 leading-relaxed shrink-0">Êtes-vous sûr de vouloir supprimer <span className="font-bold text-slate-900">{showDeleteModal.email}</span> ?</p>
            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={confirmDelete} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all uppercase tracking-widest text-[10px]">Confirmer la suppression</button>
              <button onClick={() => setShowDeleteModal(null)} className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]">Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Console SaaS Master</h2>
          <p className="text-slate-500 mt-2 font-medium">Gestion globale du parc de garages.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Revenus Est.</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600">{stats.revenue} €</span>
           </div>
           <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Garages</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900">{stats.totalGarages}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-6 sm:p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8 h-fit">
          <h3 className="text-xl font-black text-slate-800">Ajouter un Garage</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">Le système créera un compte et enverra un email d'invitation avec un mot de passe temporaire.</p>
          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email du gérant</label>
              <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" placeholder="email@garage.fr" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Abonnement</label>
              <div className="grid grid-cols-2 gap-3">
                 <button type="button" onClick={() => setNewUser({...newUser, role: 'user_basic'})} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${newUser.role === 'user_basic' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'}`}>Basic</button>
                 <button type="button" onClick={() => setNewUser({...newUser, role: 'user_premium'})} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${newUser.role === 'user_premium' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400'}`}>Premium</button>
              </div>
            </div>
            {message && (
              <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center leading-relaxed
                ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 
                  message.type === 'warning' ? 'bg-amber-50 text-amber-600' : 
                  'bg-rose-50 text-rose-600'}`}>
                {message.text}
              </div>
            )}
            <button disabled={loading} type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 uppercase tracking-widest text-xs">
              {loading ? "Création en cours..." : "Créer et Inviter"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-800">Journal des invitations</h3>
            <button onClick={loadData} className={`p-2 rounded-xl transition-all ${loading ? 'animate-spin text-blue-600' : 'text-slate-400 hover:text-blue-600'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[600px] p-4 space-y-3">
            {fetchError ? (
               <div className="py-20 text-center space-y-4 px-6">
                  <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <h4 className="text-lg font-black text-slate-800">Erreur de chargement</h4>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed">{fetchError}</p>
                  <button onClick={loadData} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest">Réessayer</button>
               </div>
            ) : invitedUsers.length === 0 && !loading ? (
              <div className="py-20 text-center space-y-4">
                 <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-200">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                 </div>
                 <p className="text-slate-400 font-bold italic">Aucun garage enregistré</p>
              </div>
            ) : (
              invitedUsers.map((user) => (
                <div key={user.id} className="p-5 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-white hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center font-black text-white ${user.status === 'Suspendu' ? 'bg-slate-300' : user.role === 'user_premium' ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-blue-600 shadow-lg shadow-blue-600/20'}`}>
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-black text-slate-800 text-sm truncate ${user.status === 'Suspendu' ? 'line-through opacity-40' : ''}`}>{user.email}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${user.status === 'Suspendu' ? 'bg-rose-100 text-rose-500' : 'bg-emerald-100 text-emerald-600'}`}>{user.status}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 bg-white border px-2 py-0.5 rounded-md">{user.role?.replace('user_', '')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => handleSuspend(user)}
                      className={`flex-1 sm:flex-none p-3 rounded-xl transition-all active:scale-95 ${user.status === 'Suspendu' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white'}`}
                    >
                      <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </button>
                    <button 
                      onClick={() => setShowDeleteModal(user)}
                      className="flex-1 sm:flex-none p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all active:scale-95"
                    >
                      <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-900 p-8 sm:p-10 rounded-[3rem] text-white overflow-hidden relative shrink-0">
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
               <h4 className="text-xl font-black mb-2">💡 Conseil d'administration</h4>
               <p className="text-blue-200 text-sm leading-relaxed">Les comptes sont créés directement via l'API Auth. Assurez-vous que l'option "Enable Email Confirmation" est désactivée dans Supabase si vous souhaitez une connexion immédiate avec le mot de passe temporaire.</p>
            </div>
            <button className="px-8 py-4 bg-white text-blue-900 font-black rounded-2xl hover:bg-blue-50 transition-all text-xs uppercase tracking-widest active:scale-95">Documentation</button>
         </div>
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
      </div>
    </div>
  );
};

export default SuperAdmin;
