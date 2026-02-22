
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
  settings?: any;
}

const Dashboard: React.FC<DashboardProps> = ({ customers, vehicles, mecaniciens, appointments, invoices, notifications = [], onMarkAsRead, onAddAppointment, onNavigate, settings }) => {
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

  // Calcul des véhicules en service
  const vehiclesInService = useMemo(() => {
    const inServiceCount = appointments.filter(a => 
      a.date === todayStr && (a.statut === 'en_attente' || a.statut === 'en_cours')
    ).length;
    return inServiceCount;
  }, [appointments, todayStr]);

  // Calcul des factures en attente
  const pendingInvoices = useMemo(() => {
    const pending = invoices.filter(f => f.statut === 'non_payee');
    const totalAmount = pending.reduce((sum, f) => sum + (Number(f.montant_ttc) || 0), 0);
    return { count: pending.length, amount: totalAmount };
  }, [invoices]);

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

  const getStatusBadge = (status: RendezVous['statut']) => {
    switch(status) {
        case 'en_attente': return { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Prévu' };
        case 'en_cours': return { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'En Cours' };
        case 'termine': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Terminé' };
        case 'annule': return { bg: 'bg-rose-500/10', text: 'text-rose-400', label: 'Annulé' };
        default: return { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Non Assigné' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div id="dash-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CA Mensuel */}
        <button onClick={() => onNavigate('invoices')} className="group glass-panel bg-glass-gradient-light dark:bg-glass-gradient p-6 rounded-3xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden card-glow text-left w-full">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all duration-500"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-14 h-14 flex items-center justify-center bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-inner">
              <span className="material-symbols-outlined text-blue-500 text-2xl">attach_money</span>
            </div>
            <span className={`text-xs font-bold flex items-center px-3 py-1.5 rounded-full ${revenueStats.percent >= 0 ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-500 bg-red-500/10 border border-red-500/20'}`}>
              {revenueStats.percent >= 0 ? '+' : ''}{revenueStats.percent.toFixed(1)}% 
              <span className="material-symbols-outlined text-xs ml-1">{revenueStats.percent >= 0 ? 'trending_up' : 'trending_down'}</span>
            </span>
          </div>
          <h3 className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium mb-1 relative z-10">CA Mensuel</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white relative z-10">
            {revenueStats.current.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
          </p>
        </button>

        {/* Véhicules en Service */}
        <button onClick={() => onNavigate('vehicles')} className="group glass-panel bg-glass-gradient-light dark:bg-glass-gradient p-6 rounded-3xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden card-glow text-left w-full">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl group-hover:bg-orange-500/30 transition-all duration-500"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-14 h-14 flex items-center justify-center bg-orange-500/10 rounded-2xl border border-orange-500/20 shadow-inner">
              <span className="material-symbols-outlined text-orange-500 text-2xl">car_repair</span>
            </div>
            <span className="text-xs font-bold text-text-muted-light dark:text-text-muted-dark flex items-center bg-white/10 border border-white/10 px-3 py-1.5 rounded-full">
              {vehiclesInService} en attente
            </span>
          </div>
          <h3 className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium mb-1 relative z-10">Véhicules en Service</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white relative z-10">{vehicles.length} Véhicules</p>
        </button>

        {/* RDV Aujourd'hui */}
        <button onClick={() => onNavigate('appointments')} className="group glass-panel bg-glass-gradient-light dark:bg-glass-gradient p-6 rounded-3xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden card-glow text-left w-full">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all duration-500"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-14 h-14 flex items-center justify-center bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-inner">
              <span className="material-symbols-outlined text-purple-500 text-2xl">calendar_today</span>
            </div>
            <div className="h-8"></div>
          </div>
          <h3 className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium mb-1 relative z-10">RDV Aujourd'hui</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white relative z-10">{todayAppointments.length} Rendez-vous</p>
        </button>

        {/* Factures en Attente */}
        <button onClick={() => onNavigate('invoices')} className="group glass-panel bg-glass-gradient-light dark:bg-glass-gradient p-6 rounded-3xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden card-glow text-left w-full">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl group-hover:bg-pink-500/30 transition-all duration-500"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-14 h-14 flex items-center justify-center bg-pink-500/10 rounded-2xl border border-pink-500/20 shadow-inner">
              <span className="material-symbols-outlined text-pink-500 text-2xl">pending_actions</span>
            </div>
            <span className="text-xs font-bold text-red-500 flex items-center bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full">
              {pendingInvoices.count} En retard
            </span>
          </div>
          <h3 className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium mb-1 relative z-10">Factures en Attente</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white relative z-10">
            {pendingInvoices.amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </p>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Planning de la Journée */}
        <div id="dash-today-list" className="lg:col-span-2 space-y-6">
          <div className="glass-panel bg-glass-gradient-light dark:bg-glass-gradient rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
            
            {/* Header */}
            <div className="p-6 border-b border-border-light dark:border-white/5 flex justify-between items-center bg-white/30 dark:bg-white/[0.02] backdrop-blur-md relative z-10">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">schedule</span>
                Planning de la Journée
              </h3>
              <button 
                onClick={() => onNavigate('appointments')}
                className="text-sm text-primary hover:text-white font-bold bg-primary/10 hover:bg-primary px-5 py-2.5 rounded-xl transition-all border border-primary/20"
              >
                Voir l'Agenda
              </button>
            </div>

            {/* Appointments List */}
            <div className="divide-y divide-border-light dark:divide-white/5 relative z-10 max-h-96 overflow-y-auto">
              {todayAppointments.length === 0 ? (
                <div className="p-6 text-center text-text-muted-light dark:text-text-muted-dark">
                  <p className="text-sm font-medium">Aucun rendez-vous prévu aujourd'hui</p>
                </div>
              ) : (
                todayAppointments.slice(0, 3).map((app) => {
                  const client = customers.find(c => c.id === app.client_id);
                  const vehicle = vehicles.find(v => v.id === app.vehicule_id);
                  const mechanic = mecaniciens.find(m => m.id === app.mecanicien_id);
                  const statusStyle = getStatusBadge(app.statut);

                  return (
                    <div key={app.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group relative">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center justify-center w-16 h-16 bg-surface-light dark:bg-surface-dark rounded-2xl text-center border border-white/20 shadow-lg">
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{app.heure.substring(0, 5)}</span>
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{app.type_intervention}</h4>
                          <p className="text-sm text-text-muted-light dark:text-text-muted-dark font-medium flex items-center gap-2 mt-1">
                            <span className="material-symbols-outlined text-base">directions_car</span>
                            {vehicle ? `${vehicle.marque} ${vehicle.modele}` : 'Véhicule inconnu'}
                            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                            {client ? `${client.prenom} ${client.nom}` : 'Client inconnu'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1.5 text-xs font-bold ${statusStyle.bg} ${statusStyle.text} rounded-xl border border-current/20`}>
                          {statusStyle.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border-light dark:border-white/5 bg-white/50 dark:bg-white/[0.02] text-center backdrop-blur-sm relative z-10">
              <button 
                onClick={() => onNavigate('appointments')}
                className="text-sm font-bold text-text-muted-light dark:text-text-muted-dark hover:text-primary dark:hover:text-primary transition-colors flex items-center justify-center gap-2 w-full"
              >
                Voir tous les rendez-vous <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div id="dash-quick-add" className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 shadow-xl shadow-blue-500/20 text-white relative overflow-hidden ring-1 ring-white/10">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-black/10 rounded-full blur-3xl"></div>
            
            <h3 className="font-bold text-lg mb-6 relative z-10 flex items-center gap-2">
              <span className="material-symbols-outlined">flash_on</span>
              Actions Rapides
            </h3>
            
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <button 
                onClick={() => onNavigate('customers')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border border-white/10 hover:border-white/30 group shadow-lg"
              >
                <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">person_add</span>
                <span className="text-xs font-bold">Ajout Client</span>
              </button>
              
              <button 
                onClick={() => onNavigate('vehicles')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border border-white/10 hover:border-white/30 group shadow-lg"
              >
                <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">directions_car</span>
                <span className="text-xs font-bold">Ajout Véhicule</span>
              </button>
              
              <button 
                onClick={() => onNavigate('invoices')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border border-white/10 hover:border-white/30 group shadow-lg"
              >
                <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">post_add</span>
                <span className="text-xs font-bold">Créer Facture</span>
              </button>
              
              <button 
                onClick={() => onNavigate('ai-assistant')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border border-white/10 hover:border-white/30 group shadow-lg"
              >
                <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">smart_toy</span>
                <span className="text-xs font-bold">Assistant IA</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-panel bg-glass-gradient-light dark:bg-glass-gradient rounded-3xl p-6 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none"></div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 relative z-10 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-500">history</span>
              Activité Récente
            </h3>
            <div className="space-y-3 relative z-10 max-h-48 overflow-y-auto">
              {appointments.slice(0, 5).map((app) => {
                const client = customers.find(c => c.id === app.client_id);
                return (
                  <div key={app.id} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors cursor-pointer border border-white/5">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{app.type_intervention}</p>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
                      {client?.prenom} {client?.nom} • {app.date}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
