
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
  const [newUser, setNewUser] = useState({ email: '', role: 'user_basic' as UserRole, garageName: '' });
  const [invitedUsers, setInvitedUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [adminEmail, setAdminEmail] = useState('');
  
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('30days');
  
  const [maintenance, setMaintenance] = useState({ enabled: false, message: '' });
  
  // Notification Broadcast State
  const [broadcast, setBroadcast] = useState({ 
    title: '', 
    message: '', 
    type: 'info' as 'info' | 'success' | 'error',
    target: 'all' as string
  });
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const initAdmin = async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email || '';
      setAdminEmail(email);
      loadData(email);
    };
    initAdmin();
  }, []);

  const loadData = async (currentAdminEmail?: string) => {
    setLoading(true);
    try {
      const [history, activityLogs, sysMaint, pwResets] = await Promise.all([
        api.fetchInvitations(),
        api.fetchGlobalActivityLogs(),
        api.getMaintenanceStatus(),
        api.fetchPasswordResetRequests()
      ]);
      
      const targetEmail = currentAdminEmail || adminEmail;
      
      // On filtre l'admin courant de la liste
      const filteredPartners = history.filter((u: any) => u.email !== targetEmail);
      
      setInvitedUsers(filteredPartners);
      // On filtre les logs pour ne garder que les actions (pas de navigation) côté affichage aussi par sécurité
      setLogs(activityLogs.filter(l => l.action_type !== 'navigation'));
      setMaintenance(sysMaint);
      setResetRequests(pwResets);
      setStats({ 
        totalGarages: filteredPartners.length, 
        revenue: filteredPartners.reduce((acc: number, curr: any) => acc + (curr.role === 'user_premium' ? 49 : 29), 0) 
      });
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

  const featureAnalysis = useMemo(() => {
    const labels: Record<string, string> = {
      'dashboard': 'Dashboard', 'appointments': 'RDV', 'customers': 'Clients',
      'vehicles': 'Véhicules', 'mechanics': 'Équipe', 'inventory': 'Stock',
      'quotes': 'Devis', 'invoices': 'Factures', 'ai-assistant': 'IA Assist', 'settings': 'Params', 'system': 'Système'
    };
    const counts: Record<string, { actions: number }> = {};
    filteredLogs.forEach(log => {
      const label = labels[log.target] || log.target || 'Autre';
      if (!counts[label]) counts[label] = { actions: 0 };
      // On compte uniquement les actions (create, update, delete, login)
      if (['create', 'update', 'delete', 'login'].includes(log.action_type)) {
          counts[label].actions++;
      }
    });
    
    return Object.entries(counts)
        .map(([name, data]) => ({ name, Actions: data.actions }))
        .sort((a, b) => b.Actions - a.Actions)
        .filter(item => item.Actions > 0); // On ne garde que s'il y a des actions
  }, [filteredLogs]);

  const activeUsersRanking = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.filter(l => l.email !== adminEmail).forEach(log => { counts[log.email] = (counts[log.email] || 0) + 1; });
    return Object.entries(counts).map(([email, count]) => ({ email, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [logs, adminEmail]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email) return;
    setLoading(true);
    try {
      const res = await api.inviteUser(newUser.email, newUser.role);
      onNotify('success', 'Invitation envoyée', `Mdp temporaire: ${res.tempPassword}`);
      setNewUser({ email: '', role: 'user_basic', garageName: '' });
      await loadData();
    } catch (err: any) { onNotify('error', 'Erreur', err.message); }
    finally { setLoading(false); }
  };

  const handleSuspend = async (user: any) => {
    const isSuspending = user.status === 'Actif';
    setLoading(true);
    try {
      await api.toggleUserSuspension(user.id, isSuspending);
      onNotify('success', 'Statut mis à jour', `Le compte de ${user.email} est désormais ${isSuspending ? 'Suspendu' : 'Réactivé'}.`);
      await loadData();
    } catch (err: any) {
      onNotify('error', 'Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!showDeleteModal || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.deleteGarageAccount(showDeleteModal.email);
      onNotify('success', 'Suppression réussie', `Le compte ${showDeleteModal.email} a été définitivement supprimé.`);
      setShowDeleteModal(null);
      await loadData();
    } catch (err: any) {
      onNotify('error', 'Erreur de suppression', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMaintenanceToggle = async () => {
    const next = { ...maintenance, enabled: !maintenance.enabled };
    try {
      await api.setMaintenanceStatus(next);
      setMaintenance(next);
      onNotify('success', 'Maintenance', next.enabled ? 'Activée globalement' : 'Désactivée');
    } catch (e: any) {
      onNotify('error', 'Erreur', e.message);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastLoading(true);
    try {
      // Si target === 'all', on passe 'all', sinon on passe l'ID
      const targetId = broadcast.target === 'all' ? 'all' : broadcast.target;
      await api.sendAdminNotification(broadcast.title, broadcast.message, broadcast.type, targetId);
      
      const targetName = broadcast.target === 'all' 
        ? `tous les garages (${stats.totalGarages})` 
        : invitedUsers.find(u => u.id === broadcast.target)?.garage_name || "le garage";

      setBroadcast({ title: '', message: '', type: 'info', target: 'all' });
      onNotify('success', 'Diffusion terminée', `Notification envoyée à ${targetName}.`);
    } catch (err: any) { onNotify('error', 'Erreur', err.message); }
    finally { setBroadcastLoading(false); }
  };

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 appearance-none">
            <option value="all">Tous les garages (Moyenne)</option>
            {invitedUsers.map(u => <option key={u.id} value={u.email}>{u.garage_name || u.email}</option>)}
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
        <button onClick={() => loadData()} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
          <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-1000"></div>
              <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">Revenus SaaS Estimés</p>
              <h3 className="text-4xl font-black">{stats.revenue} €</h3>
              <p className="text-[10px] font-medium opacity-60 mt-4 uppercase">Sur {stats.totalGarages} partenaires</p>
           </div>
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Actions totales</p>
              <h3 className="text-4xl font-black text-slate-900 dark:text-white">{filteredLogs.length}</h3>
              <p className="text-[10px] font-bold text-emerald-500 mt-2 uppercase">Créations & Mises à jour</p>
           </div>
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Dernière action</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {filteredLogs[0] ? new Date(filteredLogs[0].created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">Date & Heure précises</p>
           </div>
        </div>

        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
           <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Top Actifs (Actions)</p>
           <div className="space-y-4 flex-1">
              {activeUsersRanking.map((user, i) => (
                <button key={user.email} onClick={() => setFilterUser(user.email)} className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${filterUser === user.email ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent'}`}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? 'bg-amber-500 shadow-lg' : 'bg-slate-400'}`}>{i+1}</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{user.email.split('@')[0]}</span>
                  </div>
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 shrink-0">{user.count} acts</span>
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm min-h-[450px]">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
              <div>
                 <h3 className="text-xl font-black text-slate-800 dark:text-white">Détail par module</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Analyse des actions concrètes (création, édition, suppression).</p>
              </div>
              {filterUser !== 'all' && <button onClick={() => setFilterUser('all')} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all">Réinitialiser</button>}
           </div>
           <div className="h-[350px] w-full">
             {featureAnalysis.length === 0 ? (
               <div className="h-full flex items-center justify-center text-slate-400 italic">Aucune action sur cette période</div>
             ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={featureAnalysis} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeights: '800', fill: '#94a3b8'}} angle={-35} textAnchor="end" interval={0} />
                   <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeights: '800', fill: '#94a3b8'}} />
                   <Tooltip cursor={{fill: '#f1f5f9', radius: 10}} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', backgroundColor: '#1e293b', color: '#fff', padding: '20px' }} itemStyle={{ fontWeight: '900', fontSize: '13px' }} labelStyle={{ marginBottom: '10px', opacity: 0.5, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px' }} />
                   <Bar dataKey="Actions" fill="#8b5cf6" radius={[10, 10, 0, 0]} barSize={40} />
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
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{f.Actions} actions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400">{f.Actions}</p>
                  </div>
                </div>
              ))}
              {featureAnalysis.length === 0 && <p className="text-center py-20 text-slate-400 italic">Vide</p>}
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-20">
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => !isDeleting && setShowDeleteModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl relative flex flex-col border dark:border-slate-800 animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white text-center mb-2">Supprimer le garage ?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-8">
              Êtes-vous sûr de vouloir supprimer définitivement <span className="font-bold text-slate-900 dark:text-white">{showDeleteModal.email}</span> ? Tous ses accès seront révoqués immédiatement.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmDelete} 
                disabled={isDeleting}
                className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl shadow-rose-600/20 uppercase text-xs tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
              >
                {isDeleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Supprimer définitivement"}
              </button>
              <button onClick={() => setShowDeleteModal(null)} disabled={isDeleting} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
         <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {currentTab === 'super-admin-overview' ? "Tableau de Bord Analytique" : 
             currentTab === 'super-admin-garages' ? "Gestion des Partenaires" : 
             currentTab === 'super-admin-communication' ? "Centre de Contrôle" : "Sécurité & Journal d'Audit"}
         </h2>
         <p className="text-slate-500 dark:text-slate-400 font-medium">Administration Master SaaS • {adminEmail}</p>
      </div>

      {currentTab === 'super-admin-overview' && renderOverview()}
      {currentTab === 'super-admin-garages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm h-fit sticky top-24">
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">Nouveau Garage</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email du gérant</label>
                   <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email:e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-800 dark:text-white focus:ring-4 focus:ring-blue-500/10" placeholder="ex: chef@garage.pro" />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plan SaaS</label>
                   <div className="grid grid-cols-2 gap-2">
                     <button type="button" onClick={() => setNewUser({...newUser, role:'user_basic'})} className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${newUser.role==='user_basic' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>Standard</button>
                     <button type="button" onClick={() => setNewUser({...newUser, role:'user_premium'})} className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${newUser.role==='user_premium' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>Premium</button>
                   </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 mt-4 uppercase text-xs tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                   {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Inviter le partenaire"}
                </button>
              </form>
           </div>
           <div className="lg:col-span-2 space-y-4">
              {invitedUsers.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                   <p className="text-slate-400 font-bold italic">Aucun partenaire enregistré (autre que vous).</p>
                </div>
              ) : (
                invitedUsers.map(u => (
                  <div key={u.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-inner ${u.role==='user_premium' ? 'bg-indigo-600' : 'bg-blue-600'}`}>{u.email[0].toUpperCase()}</div>
                      <div>
                        <p className="font-black text-slate-800 dark:text-white text-lg leading-tight truncate max-w-[250px]">{u.garage_name || "Garage Sans Nom"}</p>
                        <div className="flex items-center gap-2 mt-1">
                           <p className="text-xs font-bold text-slate-400 truncate max-w-[150px]">{u.email}</p>
                           <span className="text-slate-300 dark:text-slate-700">•</span>
                           <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${u.status === 'Actif' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'}`}>{u.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleSuspend(u)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${u.status === 'Suspendu' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600'}`}>
                        {u.status === 'Suspendu' ? 'Réactiver' : 'Suspendre'}
                      </button>
                      <button onClick={() => setShowDeleteModal(u)} className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>
      )}
      {currentTab === 'super-admin-communication' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
           {/* Section Maintenance */}
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Maintenance Système</h3>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                 <span className="font-bold text-slate-800 dark:text-white">Accès global</span>
                 <button onClick={handleMaintenanceToggle} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${maintenance.enabled ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>{maintenance.enabled ? 'STOP MAINT.' : 'ACTIVER'}</button>
              </div>
              <textarea value={maintenance.message} onChange={e => setMaintenance({...maintenance, message: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl h-32 outline-none font-medium text-slate-800 dark:text-white" placeholder="Message aux utilisateurs..." />
              <button onClick={() => api.setMaintenanceStatus(maintenance)} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest">Sauvegarder le message</button>
           </div>

           {/* Section Notification Ciblée */}
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Envoyer une Notification</h3>
              <form onSubmit={handleBroadcast} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {/* Sélecteur de Type (Couleur) */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setBroadcast({...broadcast, type: 'info'})} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${broadcast.type === 'info' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-slate-100 text-slate-400'}`}>Info</button>
                            <button type="button" onClick={() => setBroadcast({...broadcast, type: 'success'})} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${broadcast.type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'border-slate-100 text-slate-400'}`}>Succès</button>
                            <button type="button" onClick={() => setBroadcast({...broadcast, type: 'error'})} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${broadcast.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-600' : 'border-slate-100 text-slate-400'}`}>Alerte</button>
                        </div>
                    </div>
                    
                    {/* Sélecteur de Cible */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destinataire</label>
                        <select 
                            value={broadcast.target} 
                            onChange={e => setBroadcast({...broadcast, target: e.target.value})} 
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-slate-900 dark:text-white"
                        >
                            <option value="all">📢 Tous les garages</option>
                            <optgroup label="Garage spécifique">
                                {invitedUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.garage_name || u.email}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                </div>

                <input required value={broadcast.title} onChange={e => setBroadcast({...broadcast, title: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" placeholder="Titre de la notification" />
                <textarea required value={broadcast.message} onChange={e => setBroadcast({...broadcast, message: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl h-32 outline-none font-medium text-slate-900 dark:text-white" placeholder="Contenu du message..." />
                
                <button type="submit" disabled={broadcastLoading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                    {broadcastLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Envoyer la notification"}
                </button>
              </form>
           </div>
        </div>
      )}
      {currentTab === 'super-admin-logs' && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm animate-in fade-in duration-500 overflow-hidden">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">Journal d'Audit de Sécurité</h3>
                  <span className="text-[10px] font-black text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full uppercase tracking-widest">Dernières actions (Max 5/user)</span>
              </div>
              <div className="flex gap-2">
                  <div className="relative">
                      <select 
                          value={filterUser} 
                          onChange={e => setFilterUser(e.target.value)} 
                          className="pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-xs text-slate-700 dark:text-slate-200 appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                          <option value="all">Tous les utilisateurs</option>
                          {invitedUsers.map(u => (
                              <option key={u.id} value={u.email}>{u.garage_name || u.email}</option>
                          ))}
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                  </div>
              </div>
           </div>
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
                          <td className="px-6 py-4 font-bold text-xs text-slate-800 dark:text-white">{log.email}</td>
                          <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${log.action_type === 'create' ? 'bg-emerald-100 text-emerald-700' : log.action_type === 'delete' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>{log.action_type}</span></td>
                          <td className="px-6 py-4 font-bold text-xs uppercase tracking-tighter opacity-60 text-slate-600 dark:text-slate-400">{log.target}</td>
                          <td className="px-6 py-4 text-right text-[10px] font-medium text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                       </tr>
                    ))}
                    {filteredLogs.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-slate-400 font-bold italic">Aucune action enregistrée pour cette sélection.</td></tr>}
                 </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;
