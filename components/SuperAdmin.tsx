
import React, { useEffect, useState, useMemo } from 'react';
import { api, supabase } from '../services/api';
import { UserRole, ActivityLog, ViewState, PasswordResetRequest } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

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
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [adminEmail, setAdminEmail] = useState('');
  
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('30days');
  
  const [maintenance, setMaintenance] = useState({ enabled: false, message: '' });
  const [broadcast, setBroadcast] = useState({ title: '', message: '', type: 'info' as 'info' | 'warning' | 'success' });
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if(data.user?.email) setAdminEmail(data.user.email); });
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [history, activityLogs, sysMaint, pwResets] = await Promise.all([
        api.fetchInvitations(),
        api.fetchGlobalActivityLogs(),
        api.getMaintenanceStatus(),
        api.fetchPasswordResetRequests()
      ]);
      setInvitedUsers(history);
      setLogs(activityLogs);
      setMaintenance(sysMaint);
      setResetRequests(pwResets);
      setStats({ totalGarages: history.length, revenue: history.reduce((acc, curr) => acc + (curr.role === 'user_premium' ? 49 : 29), 0) });
    } catch (err: any) { console.error(err); }
    finally { setLoading(false); }
  };

  const filteredLogs = useMemo(() => {
    let res = logs.filter(l => l.email !== adminEmail);
    if (filterUser !== 'all') res = res.filter(l => l.email === filterUser);
    const now = new Date();
    res = res.filter(log => {
      const logDate = new Date(log.created_at);
      const diffDays = Math.ceil(Math.abs(now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      if (filterPeriod === 'today') return diffDays <= 1;
      if (filterPeriod === '7days') return diffDays <= 7;
      if (filterPeriod === '30days') return diffDays <= 30;
      return true;
    });
    return res;
  }, [logs, adminEmail, filterUser, filterPeriod]);

  // ANALYSE DÉTAILLÉE DES USAGES (POUR RÉPONDRE À : "QUELLES FONCTIONNALITÉS IL UTILISE ?")
  const featureAnalysis = useMemo(() => {
    const labels: Record<string, string> = {
      'dashboard': 'Dashboard', 'appointments': 'RDV', 'customers': 'Clients',
      'vehicles': 'Véhicules', 'mechanics': 'Équipe', 'inventory': 'Stock',
      'quotes': 'Devis', 'invoices': 'Factures', 'ai-assistant': 'IA Assist', 'settings': 'Params'
    };
    const counts: Record<string, { navigation: number, creation: number }> = {};
    filteredLogs.forEach(log => {
      const label = labels[log.target] || log.target || 'Autre';
      if (!counts[label]) counts[label] = { navigation: 0, creation: 0 };
      if (log.action_type === 'navigation') counts[label].navigation++;
      else if (['create', 'update', 'delete'].includes(log.action_type)) counts[label].creation++;
    });
    return Object.entries(counts).map(([name, data]) => ({ 
      name, Visites: data.navigation, Actions: data.creation, Total: data.navigation + data.creation 
    })).sort((a, b) => b.Total - a.Total);
  }, [filteredLogs]);

  const activeUsersRanking = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.filter(l => l.email !== adminEmail).forEach(log => { counts[log.email] = (counts[log.email] || 0) + 1; });
    return Object.entries(counts).map(([email, count]) => ({ email, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [logs, adminEmail]);

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* FILTRES D'ANALYSE */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 appearance-none">
            <option value="all">Tous les garages (Moyenne)</option>
            {invitedUsers.map(u => <option key={u.id} value={u.email}>{u.email}</option>)}
          </select>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </div>
        <div className="w-full md:w-64 relative">
          <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm text-slate-700 dark:text-slate-200 appearance-none">
            <option value="today">Aujourd'hui</option>
            <option value="7days">7 derniers jours</option>
            <option value="30days">30 derniers jours</option>
            <option value="all">Historique complet</option>
          </select>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </div>
        <button onClick={loadData} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
          <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* KPI CARDS */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-1000"></div>
              <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">Revenus SaaS</p>
              <h3 className="text-4xl font-black">{stats.revenue} €</h3>
              <p className="text-[10px] font-medium opacity-60 mt-4 uppercase">Sur {stats.totalGarages} comptes</p>
           </div>
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Actions totales</p>
              <h3 className="text-4xl font-black text-slate-900 dark:text-white">{filteredLogs.length}</h3>
              <p className="text-[10px] font-bold text-emerald-500 mt-2 uppercase">Volume d'activité</p>
           </div>
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Dernière activité</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {filteredLogs[0] ? new Date(filteredLogs[0].created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">Date & Heure précises</p>
           </div>
        </div>

        {/* TOP USERS RANKING */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
           <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Top Engagement</p>
           <div className="space-y-4 flex-1">
              {activeUsersRanking.map((user, i) => (
                <button key={user.email} onClick={() => setFilterUser(user.email)} className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${filterUser === user.email ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent'}`}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? 'bg-amber-500 shadow-lg' : 'bg-slate-400'}`}>{i+1}</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{user.email.split('@')[0]}</span>
                  </div>
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 shrink-0">{user.count} pts</span>
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* DÉTAIL DES FONCTIONNALITÉS UTILISÉES */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm min-h-[450px]">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
              <div>
                 <h3 className="text-xl font-black text-slate-800 dark:text-white">Détail par module</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Analyse des visites vs actions concrètes (création/édition).</p>
              </div>
              {filterUser !== 'all' && <button onClick={() => setFilterUser('all')} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all">Réinitialiser</button>}
           </div>
           <div className="h-[350px] w-full">
             {featureAnalysis.length === 0 ? (
               <div className="h-full flex items-center justify-center text-slate-400 italic">Aucune donnée sur cette période</div>
             ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={featureAnalysis} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '800', fill: '#94a3b8'}} angle={-35} textAnchor="end" interval={0} />
                   <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '800', fill: '#94a3b8'}} />
                   <Tooltip cursor={{fill: '#f1f5f9', radius: 10}} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', backgroundColor: '#1e293b', color: '#fff', padding: '20px' }} itemStyle={{ fontWeight: '900', fontSize: '13px' }} labelStyle={{ marginBottom: '10px', opacity: 0.5, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px' }} />
                   <Bar dataKey="Visites" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={40} />
                   <Bar dataKey="Actions" stackId="a" fill="#8b5cf6" radius={[10, 10, 0, 0]} barSize={40} />
                 </BarChart>
               </ResponsiveContainer>
             )}
           </div>
        </div>

        <div className="xl:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col max-h-[450px]">
           <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">Répartition par module</h3>
           <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
              {featureAnalysis.map(f => (
                <div key={f.name} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{f.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{f.Visites} visites • {f.Actions} actions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400">{f.Total}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Points</p>
                  </div>
                </div>
              ))}
              {featureAnalysis.length === 0 && <p className="text-center py-20 text-slate-400 italic">Vide</p>}
           </div>
        </div>
      </div>
    </div>
  );

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email) return;
    setLoading(true);
    try {
      const res = await api.inviteUser(newUser.email, newUser.role);
      onNotify('success', 'Invitation envoyée', `Mdp temporaire: ${res.tempPassword}`);
      setNewUser({ email: '', role: 'user_basic' });
      await loadData();
    } catch (err: any) { onNotify('error', 'Erreur', err.message); }
    finally { setLoading(false); }
  };

  const handleSuspend = async (user: any) => {
    const next = user.status === 'Suspendu' ? 'Actif' : 'Suspendu';
    await api.updateInvitationStatus(user.id, next);
    onNotify('success', 'Statut mis à jour', next);
    await loadData();
  };

  const confirmDelete = async () => {
    if (!showDeleteModal) return;
    await api.deleteGarageAccount(showDeleteModal.id);
    onNotify('success', 'Supprimé', 'Compte retiré.');
    setShowDeleteModal(null);
    await loadData();
  };

  const handleMaintenanceToggle = async () => {
    const next = { ...maintenance, enabled: !maintenance.enabled };
    await api.setMaintenanceStatus(next);
    setMaintenance(next);
    onNotify('success', 'Maintenance', next.enabled ? 'ON' : 'OFF');
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastLoading(true);
    try {
      await api.sendGlobalNotification(broadcast.title, broadcast.message, broadcast.type);
      setBroadcast({ title: '', message: '', type: 'info' });
      onNotify('success', 'Envoyé', 'Notification diffusée.');
    } catch (err: any) { onNotify('error', 'Erreur', err.message); }
    finally { setBroadcastLoading(false); }
  };

  return (
    <div className="pb-20">
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setShowDeleteModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative flex flex-col border dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-slate-800 dark:text-white text-center mb-6">Supprimer {showDeleteModal.email} ?</h3>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDelete} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest">Confirmer</button>
              <button onClick={() => setShowDeleteModal(null)} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-xs tracking-widest">Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
         <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {currentTab === 'super-admin-overview' ? "Tableau de Bord Analytique" : 
             currentTab === 'super-admin-garages' ? "Gestion des Partenaires" : 
             currentTab === 'super-admin-communication' ? "Centre de Contrôle" : "Sécurité & Logs"}
         </h2>
         <p className="text-slate-500 dark:text-slate-400 font-medium">Administration Master SaaS • {adminEmail}</p>
      </div>

      {currentTab === 'super-admin-overview' && renderOverview()}
      {currentTab === 'super-admin-garages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm h-fit">
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">Nouveau Garage</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email:e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl outline-none font-bold" placeholder="Email" />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setNewUser({...newUser, role:'user_basic'})} className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest ${newUser.role==='user_basic' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100'}`}>Standard</button>
                  <button type="button" onClick={() => setNewUser({...newUser, role:'user_premium'})} className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest ${newUser.role==='user_premium' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100'}`}>Premium</button>
                </div>
                <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg mt-4 uppercase text-xs tracking-widest">Inviter</button>
              </form>
           </div>
           <div className="lg:col-span-2 space-y-4">
              {invitedUsers.map(u => (
                <div key={u.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white ${u.role==='user_premium' ? 'bg-indigo-600' : 'bg-blue-600'}`}>{u.email[0].toUpperCase()}</div>
                    <div>
                      <p className="font-black text-slate-800 dark:text-white">{u.email}</p>
                      <p className="text-[10px] font-black uppercase text-slate-400">{u.status} • {u.role.split('_')[1]}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSuspend(u)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest">{u.status==='Suspendu' ? 'Activer' : 'Suspendre'}</button>
                    <button onClick={() => setShowDeleteModal(u)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}
      {currentTab === 'super-admin-communication' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Maintenance Système</h3>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                 <span className="font-bold">Accès global</span>
                 <button onClick={handleMaintenanceToggle} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${maintenance.enabled ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>{maintenance.enabled ? 'STOP MAINT.' : 'ACTIVER'}</button>
              </div>
              <textarea value={maintenance.message} onChange={e => setMaintenance({...maintenance, message: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl h-32 outline-none font-medium" placeholder="Message aux utilisateurs..." />
              <button onClick={() => api.setMaintenanceStatus(maintenance)} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest">Sauvegarder le message</button>
           </div>
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Diffusion Globale</h3>
              <form onSubmit={handleBroadcast} className="space-y-4">
                <input required value={broadcast.title} onChange={e => setBroadcast({...broadcast, title: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl outline-none font-bold" placeholder="Titre" />
                <textarea required value={broadcast.message} onChange={e => setBroadcast({...broadcast, message: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl h-32 outline-none font-medium" placeholder="Message..." />
                <button type="submit" disabled={broadcastLoading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest">Diffuser aux {stats.totalGarages} garages</button>
              </form>
           </div>
        </div>
      )}
      {currentTab === 'super-admin-logs' && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm animate-in fade-in duration-500 overflow-hidden">
           <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8">Journal d'Audit de Sécurité</h3>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                       <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilisateur</th>
                       <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                       <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Module</th>
                       <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Date</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLogs.map(log => (
                       <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-xs">{log.email}</td>
                          <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${log.action_type === 'create' ? 'bg-emerald-100 text-emerald-700' : log.action_type === 'delete' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>{log.action_type}</span></td>
                          <td className="px-6 py-4 font-bold text-xs uppercase tracking-tighter opacity-60">{log.target}</td>
                          <td className="px-6 py-4 text-right text-[10px] font-medium text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;
