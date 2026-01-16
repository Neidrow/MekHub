
import React, { useEffect, useState, useMemo } from 'react';
import { api, supabase } from '../services/api';
import { UserRole, ActivityLog, ViewState } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SuperAdminProps {
  currentTab: ViewState;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

const SuperAdmin: React.FC<SuperAdminProps> = ({ currentTab, onNotify }) => {
  const [stats, setStats] = useState({ totalGarages: 0, revenue: 0 });
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', role: 'user_basic' as UserRole });
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [adminEmail, setAdminEmail] = useState('');
  
  // Maintenance & Broadcast
  const [maintenance, setMaintenance] = useState({ enabled: false, message: '' });
  const [broadcast, setBroadcast] = useState({ title: '', message: '', type: 'info' as 'info' | 'warning' | 'success' });
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  
  // States pour la suppression
  const [showDeleteModal, setShowDeleteModal] = useState<any>(null);

  useEffect(() => {
    // Récupérer l'email de l'admin pour le filtrage
    supabase.auth.getUser().then(({ data }) => {
        if(data.user?.email) setAdminEmail(data.user.email);
    });
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [history, activityLogs, sysMaint] = await Promise.all([
        api.fetchInvitations(),
        api.fetchGlobalActivityLogs(),
        api.getMaintenanceStatus()
      ]);
      setInvitedUsers(history);
      setLogs(activityLogs);
      setMaintenance(sysMaint);
      
      setStats({ 
        totalGarages: history.length, 
        revenue: history.reduce((acc, curr) => acc + (curr.role === 'user_premium' ? 49 : 29), 0)
      });
    } catch (err: any) {
      console.error("Erreur SuperAdmin loadData:", err);
      setFetchError(err.message || "Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  };

  // --- FILTRAGE : Exclure l'admin ---
  const filteredLogs = useMemo(() => {
      if (!adminEmail) return logs;
      return logs.filter(l => l.email !== adminEmail);
  }, [logs, adminEmail]);

  // --- ANALYTICS PROCESSING (Sur logs filtrés) ---
  const featureData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLogs.forEach(log => {
      if (log.action_type === 'navigation' && log.target) {
        counts[log.target] = (counts[log.target] || 0) + 1;
      }
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [filteredLogs]);

  // --- DERNIERES CONNEXIONS UNIQUES ---
  const recentLogins = useMemo(() => {
    const loginMap = new Map<string, ActivityLog>();
    
    // On parcourt les logs (déjà triés par date décroissante depuis l'API normalement, sinon filterLogs respecte l'ordre)
    // On ne garde que la première occurrence (la plus récente) pour chaque email
    filteredLogs.forEach(log => {
        if (log.action_type === 'login' && !loginMap.has(log.email)) {
            loginMap.set(log.email, log);
        }
    });

    // Convertir en tableau et prendre les 10 premiers
    return Array.from(loginMap.values()).slice(0, 10);
  }, [filteredLogs]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await api.inviteUser(newUser.email, newUser.role);
      setMessage({ text: `Compte créé avec succès ! Email d'invitation envoyé à ${newUser.email}.`, type: 'success' });
      setNewUser({ email: '', role: 'user_basic' });
      await loadData();
    } catch (err: any) {
      console.error("Erreur création utilisateur:", err);
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
      onNotify('success', 'Statut mis à jour', `Le compte est désormais ${newStatus}.`);
    } catch (err) {
      console.error(err);
      onNotify('error', 'Erreur', "Impossible de changer le statut.");
    }
  };

  const confirmDelete = async () => {
    if (!showDeleteModal) return;
    try {
      await api.deleteGarageAccount(showDeleteModal.id);
      setShowDeleteModal(null);
      await loadData();
      onNotify('success', 'Compte supprimé', "Le garage a été retiré de la base.");
    } catch (err) {
      console.error(err);
      onNotify('error', 'Erreur', "Impossible de supprimer le compte.");
    }
  };

  const handleMaintenanceToggle = async () => {
    try {
      const newState = { ...maintenance, enabled: !maintenance.enabled };
      setMaintenance(newState);
      await api.setMaintenanceStatus(newState);
      onNotify('success', 'Maintenance', `Mode maintenance ${newState.enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}.`);
    } catch (e) {
      console.error(e);
      onNotify('error', 'Erreur', "Impossible de modifier le mode maintenance.");
    }
  };

  const handleMaintenanceMessageChange = async () => {
    try {
      await api.setMaintenanceStatus(maintenance);
      onNotify('success', 'Message sauvegardé', "Le message de maintenance a été mis à jour.");
    } catch (e) {
      console.error(e);
      onNotify('error', 'Erreur', "Impossible d'enregistrer le message.");
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcast.title || !broadcast.message) return;
    
    setBroadcastLoading(true);
    try {
      await api.sendGlobalNotification(broadcast.title, broadcast.message, broadcast.type);
      setBroadcast({ title: '', message: '', type: 'info' });
      onNotify('success', 'Diffusion réussie', "La notification a été envoyée à tous les garages.");
    } catch (e: any) {
      onNotify('error', 'Erreur Diffusion', e.message);
    } finally {
      setBroadcastLoading(false);
    }
  };

  // --- RENDER PER TAB ---

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Revenus Mensuels Est.</p>
            <h3 className="text-4xl font-black">{stats.revenue} €</h3>
            <p className="text-xs font-medium opacity-60 mt-4">Basé sur les abonnements actifs</p>
         </div>
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Garages Partenaires</p>
            <h3 className="text-4xl font-black text-slate-900 dark:text-white">{stats.totalGarages}</h3>
            <p className="text-xs font-bold text-emerald-500 mt-2 flex items-center gap-1">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
               Actifs sur la plateforme
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GRAPHIQUE FONCTIONNALITÉS */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm h-96 flex flex-col">
           <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6">Usage des Fonctionnalités (Utilisateurs)</h3>
           <div className="flex-1 w-full min-h-0">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={featureData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                 <XAxis type="number" hide />
                 <YAxis type="category" dataKey="name" width={80} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                 <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#fff' }}
                 />
                 <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}>
                    {featureData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* DERNIÈRES CONNEXIONS UNIQUES */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-96">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Dernières connexions</h3>
              <button 
                onClick={loadData}
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors"
                title="Rafraîchir"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
              {recentLogins.length === 0 ? (
                 <p className="text-slate-400 text-sm italic">Aucune activité récente.</p>
              ) : (
                 recentLogins.map(log => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                       <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                             {log.email ? log.email.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div className="min-w-0">
                             <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{log.email || 'Utilisateur Inconnu'}</p>
                             <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Dernier accès</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] text-slate-900 dark:text-white font-bold">{new Date(log.created_at).toLocaleDateString()}</p>
                          <p className="text-[9px] text-slate-500">{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                       </div>
                    </div>
                 ))
              )}
           </div>
        </div>
      </div>
    </div>
  );

  const renderGarages = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulaire Création */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 h-fit sticky top-6">
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">Nouveau Garage</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Invitez un nouveau partenaire.</p>
          </div>
          <form onSubmit={handleCreateUser} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
              <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="contact@garage.com" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plan</label>
              <div className="grid grid-cols-2 gap-3">
                 <button type="button" onClick={() => setNewUser({...newUser, role: 'user_basic'})} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${newUser.role === 'user_basic' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}>Basic</button>
                 <button type="button" onClick={() => setNewUser({...newUser, role: 'user_premium'})} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${newUser.role === 'user_premium' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}>Premium</button>
              </div>
            </div>
            {message && (
              <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center leading-relaxed
                ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 
                  message.type === 'warning' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 
                  'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                {message.text}
              </div>
            )}
            <button disabled={loading} type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Envoyer l'invitation"}
            </button>
          </form>
        </div>

        {/* Liste */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
             <h3 className="text-xl font-black text-slate-800 dark:text-white">Annuaire des Garages</h3>
             <button onClick={loadData} className="p-2 bg-white dark:bg-slate-800 rounded-xl hover:shadow-md transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
               <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
             </button>
          </div>
          
          {invitedUsers.length === 0 ? (
             <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 dark:text-slate-600 font-bold italic">Aucun garage enregistré</p>
             </div>
          ) : (
             invitedUsers.map((user) => (
                <div key={user.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm hover:shadow-lg transition-all group">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg ${user.status === 'Suspendu' ? 'bg-slate-300 dark:bg-slate-700' : user.role === 'user_premium' ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-blue-600 shadow-blue-500/20'}`}>
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`font-black text-slate-800 dark:text-white text-base ${user.status === 'Suspendu' ? 'line-through opacity-50' : ''}`}>{user.email}</p>
                      <div className="flex gap-2 mt-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${user.status === 'Suspendu' ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-900/10 dark:border-rose-800 dark:text-rose-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/10 dark:border-emerald-800 dark:text-emerald-400'}`}>{user.status}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{user.role?.replace('user_', '')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => handleSuspend(user)}
                      className={`px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${user.status === 'Suspendu' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/20 dark:text-amber-400'}`}
                    >
                      {user.status === 'Suspendu' ? 'Réactiver' : 'Suspendre'}
                    </button>
                    <button 
                      onClick={() => setShowDeleteModal(user)}
                      className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/10 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all"
                      title="Supprimer définitivement"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
             ))
          )}
        </div>
      </div>
    </div>
  );

  const renderCommunication = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* MAINTENANCE */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
             
             <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg transition-colors ${maintenance.enabled ? 'bg-rose-600' : 'bg-emerald-600'}`}>
                   {maintenance.enabled ? '🚧' : '✅'}
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-800 dark:text-white">Maintenance Système</h3>
                   <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Verrouille l'accès pour tous les garages.</p>
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                   <span className="font-bold text-slate-700 dark:text-slate-200">État du service</span>
                   <button 
                      onClick={handleMaintenanceToggle}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${maintenance.enabled ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400'}`}
                   >
                      {maintenance.enabled ? 'Arrêter Maintenance' : 'Activer Maintenance'}
                   </button>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message d'information</label>
                   <textarea 
                      value={maintenance.message} 
                      onChange={(e) => setMaintenance({...maintenance, message: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-medium text-slate-800 dark:text-white h-32 focus:ring-4 focus:ring-amber-500/10"
                      placeholder="Ex: Mise à jour critique. Retour prévu à 14h."
                   />
                   <div className="text-right">
                      <button onClick={handleMaintenanceMessageChange} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-80 transition-all">
                         Enregistrer le message
                      </button>
                   </div>
                </div>
             </div>
          </div>

          {/* NOTIFICATIONS */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
             
             <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/20">
                   📢
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-800 dark:text-white">Diffusion Globale</h3>
                   <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Envoyer une notification à tous les garages.</p>
                </div>
             </div>

             <form onSubmit={handleBroadcast} className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                   <div className="flex gap-2">
                      {(['info', 'warning', 'success'] as const).map(t => (
                         <button 
                            key={t}
                            type="button" 
                            onClick={() => setBroadcast({...broadcast, type: t})}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                               broadcast.type === t 
                               ? (t === 'info' ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : t === 'warning' ? 'bg-amber-50 border-amber-500 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400')
                               : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                            }`}
                         >
                            {t}
                         </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titre</label>
                   <input 
                      required
                      value={broadcast.title}
                      onChange={(e) => setBroadcast({...broadcast, title: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm text-slate-900 dark:text-white"
                      placeholder="Titre de l'annonce"
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message</label>
                   <textarea 
                      required
                      value={broadcast.message}
                      onChange={(e) => setBroadcast({...broadcast, message: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-medium text-slate-800 dark:text-white h-24"
                      placeholder="Contenu du message..."
                   />
                </div>

                <button 
                   type="submit" 
                   disabled={broadcastLoading}
                   className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                   {broadcastLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Diffuser"}
                </button>
             </form>
          </div>
       </div>
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
             <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">Journal d'activité global</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Traçabilité complète des actions utilisateurs.</p>
             </div>
             <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                {filteredLogs.length} Entrées
             </div>
          </div>

          <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                   <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilisateur</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cible</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                   {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                         <td className="px-6 py-4">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{log.email || 'Anonyme'}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{log.user_id?.split('-')[0]}...</p>
                         </td>
                         <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${
                               log.action_type === 'login' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                               log.action_type === 'create' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                               log.action_type === 'delete' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' :
                               'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                               {log.action_type}
                            </span>
                         </td>
                         <td className="px-6 py-4">
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 capitalize">{log.target}</p>
                            {log.details && <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5 truncate max-w-[200px]">{log.details}</p>}
                         </td>
                         <td className="px-6 py-4">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{new Date(log.created_at).toLocaleString()}</p>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );

  return (
    <div className="pb-20">
      {/* Modal de Confirmation de Suppression */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setShowDeleteModal(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative cursor-default animate-in zoom-in duration-300 flex flex-col max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowDeleteModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shrink-0">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white text-center mb-1 shrink-0">Suppression définitive</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center text-xs mb-6 leading-relaxed shrink-0">Êtes-vous sûr de vouloir supprimer <span className="font-bold text-slate-900 dark:text-white">{showDeleteModal.email}</span> ?</p>
            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={confirmDelete} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all uppercase tracking-widest text-[10px]">Confirmer la suppression</button>
              <button onClick={() => setShowDeleteModal(null)} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-[10px]">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* TITRE DE LA PAGE */}
      <div className="mb-8">
         <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {currentTab === 'super-admin-overview' ? "Vue d'ensemble" : 
             currentTab === 'super-admin-garages' ? "Gestion des Partenaires" : 
             currentTab === 'super-admin-communication' ? "Centre de Contrôle" :
             "Sécurité & Logs"}
         </h2>
         <p className="text-slate-500 dark:text-slate-400 font-medium">Administration Master SaaS</p>
      </div>

      {/* CONTENU DE L'ONGLET */}
      {currentTab === 'super-admin-overview' && renderOverview()}
      {currentTab === 'super-admin-garages' && renderGarages()}
      {currentTab === 'super-admin-communication' && renderCommunication()}
      {currentTab === 'super-admin-logs' && renderLogs()}

    </div>
  );
};

export default SuperAdmin;
