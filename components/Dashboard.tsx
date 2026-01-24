
import React, { useState, useMemo } from 'react';
import { Client, Vehicule, RendezVous, Mecanicien, ViewState, Facture } from '../types';

interface DashboardProps {
  customers: Client[];
  vehicles: Vehicule[];
  mecaniciens: Mecanicien[];
  appointments: RendezVous[];
  invoices: Facture[];
  onAddAppointment: (app: Omit<RendezVous, 'id' | 'user_id'>) => void;
  onNavigate: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ customers, vehicles, mecaniciens, appointments, invoices, onAddAppointment, onNavigate }) => {
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

  const currentDate = new Date().toLocaleDateString('fr-FR', {
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
    { label: 'CA Mensuel', value: `${revenueStats.current.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`, target: 'invoices' as ViewState, trend: revenueStats.percent, isCurrency: true },
    { label: 'Clients', value: customers.length, target: 'customers' as ViewState },
    { label: 'Véhicules', value: vehicles.length, target: 'vehicles' as ViewState },
    { label: "RDV Aujourd'hui", value: todayAppointments.length, target: 'appointments' as ViewState },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newRDV.mecanicien_id) { setError('Veuillez affecter un mécanicien.'); return; }
    setLoading(true);
    try {
      await onAddAppointment(newRDV);
      setIsModalOpen(false);
      setNewRDV({ client_id: '', vehicule_id: '', mecanicien_id: '', type_intervention: '', date: todayStr, heure: '09:00', duree: '1h', description: '', notes: '', statut: 'en_attente' });
    } catch (err: any) { setError(err?.message || "Erreur lors de l'enregistrement."); }
    finally { setLoading(false); }
  };

  const statusLabels: Record<string, string> = { 'en_attente': 'Planifié', 'en_cours': 'En cours', 'termine': 'Terminé', 'annule': 'Annulé' };

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-500">
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
              <div><h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">Planifier une intervention</h2><p className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest mt-1">Saisie rapide Dashboard</p></div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client</label><select required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newRDV.client_id} onChange={e => setNewRDV({...newRDV, client_id: e.target.value, vehicule_id: ''})}><option value="">Sélectionner</option>{customers.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Véhicule</label><select required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newRDV.vehicule_id} onChange={e => setNewRDV({...newRDV, vehicule_id: e.target.value})}><option value="">Sélectionner</option>{vehicles.filter(v => v.client_id === newRDV.client_id).map(v => (<option key={v.id} value={v.id}>{v.immatriculation} - {v.marque} {v.modele}</option>))}</select></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type d'intervention</label><input required placeholder="ex: Révision complète" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newRDV.type_intervention} onChange={e => setNewRDV({...newRDV, type_intervention: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mécanicien affecté</label><select required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newRDV.mecanicien_id} onChange={e => setNewRDV({...newRDV, mecanicien_id: e.target.value})}><option value="">Affecter un mécanicien</option>{mecaniciens.map(m => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label><input type="date" required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newRDV.date} onChange={e => setNewRDV({...newRDV, date: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Heure</label><input type="time" required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newRDV.heure} onChange={e => setNewRDV({...newRDV, heure: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Durée prévue</label><select className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newRDV.duree} onChange={e => setNewRDV({...newRDV, duree: e.target.value})}><option value="30m">30 min</option><option value="1h">1 heure</option><option value="2h">2 heures</option><option value="3h">3 heures</option><option value="4h">Demi-journée</option><option value="8h">Journée complète</option></select></div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Statut</label><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{(['en_attente', 'en_cours', 'termine', 'annule'] as const).map(s => (<button key={s} type="button" onClick={() => setNewRDV({...newRDV, statut: s})} className={`py-2 px-1 rounded-xl border-2 font-black text-[9px] uppercase tracking-tighter transition-all ${newRDV.statut === s ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}>{statusLabels[s]}</button>))}</div></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Notes</label><textarea className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold h-24 text-slate-900 dark:text-white" value={newRDV.description} onChange={e => setNewRDV({...newRDV, description: e.target.value})} /></div>
              {error && <div className="p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase text-center">{error}</div>}
              <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95">{loading ? "Chargement..." : "Confirmer le rendez-vous"}</button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl lg:text-4xl font-extrabold text-[#1e293b] dark:text-white">Tableau de bord</h1><p className="text-slate-500 dark:text-slate-400 mt-1">{currentDate}</p></div>
        <button id="tour-quick-rdv" onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95">Nouveau RDV</button>
      </div>

      <div id="tour-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <div id="tour-today-rdv" className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8">
          <h2 className="text-xl font-black text-[#1e293b] dark:text-white mb-6">RDV du jour</h2>
          <div className="space-y-4">
            {todayAppointments.length === 0 ? (
              <div className="py-16 text-center text-slate-300 dark:text-slate-600 italic font-bold">Aucun rendez-vous aujourd'hui</div>
            ) : (
              todayAppointments.map(app => {
                const client = customers.find(c => c.id === app.client_id);
                return (
                  <div key={app.id} className="p-5 bg-slate-50 dark:bg-slate-800 border border-transparent rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:bg-slate-100 dark:hover:bg-slate-700">
                    <div>
                      <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{client?.nom} {client?.prenom}</p>
                      <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mt-0.5">{app.type_intervention}</p>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                      <p className="font-black text-slate-900 dark:text-white">{app.heure}</p>
                      <span className="text-[9px] uppercase font-black text-slate-400">{statusLabels[app.statut]}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
