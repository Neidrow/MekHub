
import React, { useState, useMemo } from 'react';
import { Client, Vehicule, RendezVous, Mecanicien, ViewState, Facture, Notification } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  customers: Client[];
  vehicles: Vehicule[];
  mecaniciens: Mecanicien[];
  appointments: RendezVous[];
  invoices: Facture[];
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onAddAppointment: (app: Omit<RendezVous, 'id' | 'user_id'>) => void;
  onNavigate: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ customers, vehicles, mecaniciens, appointments, invoices, notifications = [], onMarkAsRead, onAddAppointment, onNavigate }) => {
  const { t, locale, language } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [newRDV, setNewRDV] = useState({
    client_id: '',
    vehicule_id: '',
    mecanicien_id: '',
    type_intervention: '',
    date: new Date().toISOString().split('T')[0],
    heure: '09:00',
    duree: '1h',
    description: '',
    notes: '',
    statut: 'en_attente' as RendezVous['statut']
  });

  const currentDate = new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = useMemo(() => appointments.filter(app => app.date === todayStr), [appointments, todayStr]);

  // Calcul du Chiffre d'Affaires (CA) réel (Encaissement)
  const revenueStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    const getRealRevenue = (inv: Facture) => {
        if (inv.statut === 'annule') return 0;
        if (inv.statut === 'payee') return Number(inv.montant_ttc) || 0;
        if (inv.statut === 'non_payee' && inv.acompte > 0) return Number(inv.acompte) || 0;
        return 0;
    };

    const currentRevenue = invoices
      .filter(inv => {
        const d = new Date(inv.date_facture);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, inv) => sum + getRealRevenue(inv), 0);

    const lastRevenue = invoices
      .filter(inv => {
        const d = new Date(inv.date_facture);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      })
      .reduce((sum, inv) => sum + getRealRevenue(inv), 0);

    let percentChange = 0;
    if (lastRevenue > 0) {
      percentChange = ((currentRevenue - lastRevenue) / lastRevenue) * 100;
    } else if (currentRevenue > 0) {
      percentChange = 100; 
    }

    return { current: currentRevenue, last: lastRevenue, percent: percentChange };
  }, [invoices]);

  const stats = [
    { label: t('dashboard.monthly_revenue'), value: `${revenueStats.current.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${language === 'en' ? '$' : '€'}`, target: 'invoices' as ViewState, trend: revenueStats.percent, isCurrency: true },
    { label: t('dashboard.customers_count'), value: customers.length, target: 'customers' as ViewState },
    { label: t('dashboard.vehicles_count'), value: vehicles.length, target: 'vehicles' as ViewState },
    { label: t('dashboard.today_rdv'), value: todayAppointments.length, target: 'appointments' as ViewState },
  ];

  const checkMechanicAvailability = (mechId: string, date: string, time: string, duration: string): boolean => {
    let durationMin = 60;
    if (duration.includes('m')) durationMin = parseInt(duration);
    else if (duration.includes('h')) durationMin = parseInt(duration) * 60;

    const [h, m] = time.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + durationMin;

    const conflicts = appointments.filter(a => {
        if (a.statut === 'annule') return false;
        if (a.mecanicien_id !== mechId) return false;
        if (a.date !== date) return false;

        let aDurationMin = 60;
        if (a.duree.includes('m')) aDurationMin = parseInt(a.duree);
        else if (a.duree.includes('h')) aDurationMin = parseInt(a.duree) * 60;

        const [ah, am] = a.heure.split(':').map(Number);
        const aStart = ah * 60 + am;
        const aEnd = aStart + aDurationMin;

        return (startMin < aEnd && endMin > aStart);
    });

    return conflicts.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newRDV.mecanicien_id) { setError(t('appointments.error_mechanic')); return; }

    const isAvailable = checkMechanicAvailability(newRDV.mecanicien_id, newRDV.date, newRDV.heure, newRDV.duree);
    if (!isAvailable) {
        setError(t('appointments.error_conflict'));
        return;
    }

    setLoading(true);
    try {
      await onAddAppointment(newRDV);
      setIsModalOpen(false);
      setNewRDV({ client_id: '', vehicule_id: '', mecanicien_id: '', type_intervention: '', date: todayStr, heure: '09:00', duree: '1h', description: '', notes: '', statut: 'en_attente' });
    } catch (err: any) { setError(t('common.error_save')); }
    finally { setLoading(false); }
  };

  const statusLabels: Record<string, string> = {
    'en_attente': t('appointments.status_pending'),
    'en_cours': t('appointments.status_progress'),
    'termine': t('appointments.status_done'),
    'annule': t('appointments.status_cancelled')
  };

  // Helper pour le style de la liste (similaire à Appointments.tsx mais plus compact pour le dashboard)
  const getCompactStatusStyle = (status: RendezVous['statut']) => {
    switch(status) {
      case 'en_attente': return 'border-l-4 border-blue-500 bg-white dark:bg-slate-800';
      case 'en_cours': return 'border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-900/10';
      case 'termine': return 'border-l-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10';
      case 'annule': return 'border-l-4 border-rose-500 bg-rose-50/50 dark:bg-rose-900/10 opacity-75';
      default: return 'bg-white dark:bg-slate-800';
    }
  };

  const getStatusBadge = (status: RendezVous['statut']) => {
    switch(status) {
        case 'en_attente': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
        case 'en_cours': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
        case 'termine': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
        case 'annule': return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20';
        default: return 'text-slate-500 bg-slate-100';
    }
  };

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-500">
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
              <div><h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{t('dashboard.quick_add')}</h2></div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('nav.customers')}</label><select required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newRDV.client_id} onChange={e => setNewRDV({...newRDV, client_id: e.target.value, vehicule_id: ''})}><option value="">{t('common.select')}</option>{customers.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('nav.vehicles')}</label><select required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newRDV.vehicule_id} onChange={e => setNewRDV({...newRDV, vehicule_id: e.target.value})}><option value="">{t('common.select')}</option>{vehicles.filter(v => v.client_id === newRDV.client_id).map(v => (<option key={v.id} value={v.id}>{v.immatriculation} - {v.marque} {v.modele}</option>))}</select></div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('appointments.type')}</label><input required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newRDV.type_intervention} onChange={e => setNewRDV({...newRDV, type_intervention: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('nav.mechanics')}</label><select required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newRDV.mecanicien_id} onChange={e => setNewRDV({...newRDV, mecanicien_id: e.target.value})}><option value="">{t('common.select')}</option>{mecaniciens.map(m => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}</select></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.date')}</label><input type="date" required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newRDV.date} onChange={e => setNewRDV({...newRDV, date: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('appointments.time')}</label><input type="time" required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newRDV.heure} onChange={e => setNewRDV({...newRDV, heure: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('appointments.duration')}</label><select className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newRDV.duree} onChange={e => setNewRDV({...newRDV, duree: e.target.value})}><option value="30m">30 min</option><option value="1h">1 heure</option><option value="2h">2 heures</option><option value="3h">3 heures</option><option value="4h">4 heures</option><option value="8h">8 heures</option></select></div>
              </div>

              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.description')}</label><textarea className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold h-24 text-slate-900 dark:text-white" value={newRDV.description} onChange={e => setNewRDV({...newRDV, description: e.target.value})} /></div>
              
              {error && <div className="p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase text-center">{error}</div>}
              
              <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95">{loading ? t('common.loading') : t('common.confirm')}</button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl lg:text-4xl font-extrabold text-[#1e293b] dark:text-white">{t('dashboard.title')}</h1><p className="text-slate-500 dark:text-slate-400 mt-1 capitalize">{currentDate}</p></div>
        <button id="dash-quick-add" onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95">{t('dashboard.quick_add')}</button>
      </div>

      <div id="dash-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} onClick={() => onNavigate(stat.target)} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
            {stat.isCurrency && (<div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10"><svg className="w-20 h-20 text-blue-900 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>)}
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className={`text-3xl font-black ${stat.isCurrency ? 'text-blue-600 dark:text-blue-400' : 'text-[#1e293b] dark:text-white'}`}>{stat.value}</h3>
            {stat.trend !== undefined && (<div className={`mt-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${stat.trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{stat.trend >= 0 ? (<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>) : (<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>)}<span>{Math.abs(stat.trend).toFixed(1)}% vs M-1</span></div>)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div id="dash-today-list" className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8">
          <h2 className="text-xl font-black text-[#1e293b] dark:text-white mb-6">{t('dashboard.today_list_title')}</h2>
          <div className="space-y-4">
            {todayAppointments.length === 0 ? (
              <div className="py-16 text-center text-slate-300 dark:text-slate-600 italic font-bold">{t('dashboard.no_rdv_today')}</div>
            ) : (
              todayAppointments.map(app => {
                const client = customers.find(c => c.id === app.client_id);
                return (
                  <div key={app.id} className={`p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:shadow-md ${getCompactStatusStyle(app.statut)}`}>
                    <div>
                      <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{client?.nom} {client?.prenom}</p>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">{app.type_intervention}</p>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                      <p className="font-black text-slate-900 dark:text-white">{app.heure}</p>
                      <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded ${getStatusBadge(app.statut)}`}>{statusLabels[app.statut]}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="xl:col-span-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 flex flex-col max-h-[500px]">
           <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-[#1e293b] dark:text-white">{t('dashboard.notifications')}</h2>
              <span className="bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">{notifications.filter(n => !n.read).length} {t('dashboard.new_notifs')}</span>
           </div>
           
           <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3">
              {notifications.length === 0 ? (
                 <div className="py-10 text-center text-slate-300 dark:text-slate-600 italic font-bold text-sm">{t('dashboard.all_calm')}</div>
              ) : (
                 notifications.map(n => (
                    <div key={n.id} className={`p-4 rounded-2xl border transition-all ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-70'}`}>
                       <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-xs font-black ${!n.read ? 'text-blue-900 dark:text-blue-200' : 'text-slate-600 dark:text-slate-400'}`}>{n.title}</h4>
                          {!n.read && onMarkAsRead && (
                             <button onClick={() => onMarkAsRead(n.id)} className="text-[9px] font-bold text-blue-500 hover:underline">{t('dashboard.read')}</button>
                          )}
                       </div>
                       <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                       <p className="text-[8px] font-bold text-slate-300 dark:text-slate-500 uppercase mt-2 text-right">{new Date(n.created_at || '').toLocaleDateString(locale)}</p>
                    </div>
                 ))
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
