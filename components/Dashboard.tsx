
import React, { useState, useMemo } from 'react';
import { Client, Vehicule, RendezVous, Mecanicien, ViewState } from '../types';

interface DashboardProps {
  customers: Client[];
  vehicles: Vehicule[];
  mecaniciens: Mecanicien[];
  appointments: RendezVous[];
  onAddAppointment: (app: Omit<RendezVous, 'id' | 'user_id'>) => void;
  onNavigate: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ customers, vehicles, mecaniciens, appointments, onAddAppointment, onNavigate }) => {
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

  const stats = [
    { label: 'Clients', value: customers.length, target: 'customers' as ViewState },
    { label: 'Véhicules', value: vehicles.length, target: 'vehicles' as ViewState },
    { label: "RDV Aujourd'hui", value: todayAppointments.length, target: 'appointments' as ViewState },
    { label: 'Alertes Stock', value: 0, target: 'inventory' as ViewState },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newRDV.mecanicien_id) {
      setError('Veuillez affecter un mécanicien.');
      return;
    }

    setLoading(true);
    try {
      await onAddAppointment(newRDV);
      setIsModalOpen(false);
      setNewRDV({
        client_id: '',
        vehicule_id: '',
        mecanicien_id: '',
        type_intervention: '',
        date: todayStr,
        heure: '09:00',
        duree: '1h',
        description: '',
        notes: '',
        statut: 'en_attente'
      });
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const statusLabels: Record<string, string> = {
    'en_attente': 'Planifié',
    'en_cours': 'En cours',
    'termine': 'Terminé',
    'annule': 'Annulé'
  };

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-500">
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Planifier une intervention</h2>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Saisie rapide Dashboard</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newRDV.client_id} onChange={e => setNewRDV({...newRDV, client_id: e.target.value, vehicule_id: ''})}>
                    <option value="">Sélectionner</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Véhicule</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newRDV.vehicule_id} onChange={e => setNewRDV({...newRDV, vehicule_id: e.target.value})}>
                    <option value="">Sélectionner</option>
                    {vehicles.filter(v => v.client_id === newRDV.client_id).map(v => (
                      <option key={v.id} value={v.id}>{v.immatriculation} - {v.marque} {v.modele}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type d'intervention</label>
                  <input required placeholder="ex: Révision complète" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newRDV.type_intervention} onChange={e => setNewRDV({...newRDV, type_intervention: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mécanicien affecté</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newRDV.mecanicien_id} onChange={e => setNewRDV({...newRDV, mecanicien_id: e.target.value})}>
                    <option value="">Affecter un mécanicien</option>
                    {mecaniciens.map(m => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                  <input type="date" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newRDV.date} onChange={e => setNewRDV({...newRDV, date: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Heure</label>
                  <input type="time" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newRDV.heure} onChange={e => setNewRDV({...newRDV, heure: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Durée prévue</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newRDV.duree} onChange={e => setNewRDV({...newRDV, duree: e.target.value})}>
                    <option value="30m">30 min</option>
                    <option value="1h">1 heure</option>
                    <option value="2h">2 heures</option>
                    <option value="3h">3 heures</option>
                    <option value="4h">Demi-journée</option>
                    <option value="8h">Journée complète</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Statut</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['en_attente', 'en_cours', 'termine', 'annule'] as const).map(s => (
                    <button 
                      key={s} 
                      type="button" 
                      onClick={() => setNewRDV({...newRDV, statut: s})}
                      className={`py-2 px-1 rounded-xl border-2 font-black text-[9px] uppercase tracking-tighter transition-all ${newRDV.statut === s ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'}`}
                    >
                      {statusLabels[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Notes</label>
                <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold h-24" value={newRDV.description} onChange={e => setNewRDV({...newRDV, description: e.target.value})} />
              </div>

              {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase text-center">{error}</div>}

              <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95">
                {loading ? "Chargement..." : "Confirmer le rendez-vous"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-4xl font-extrabold text-[#1e293b]">Tableau de bord</h1>
          <p className="text-slate-500 mt-1">{currentDate}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 active:scale-95">Nouveau RDV</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} onClick={() => onNavigate(stat.target)} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all">
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-3xl font-black text-[#1e293b]">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
          <h2 className="text-xl font-black text-[#1e293b] mb-6">RDV du jour</h2>
          <div className="space-y-4">
            {todayAppointments.length === 0 ? (
              <div className="py-16 text-center text-slate-300 italic font-bold">Aucun rendez-vous aujourd'hui</div>
            ) : (
              todayAppointments.map(app => {
                const client = customers.find(c => c.id === app.client_id);
                return (
                  <div key={app.id} className="p-5 bg-slate-50 border border-transparent rounded-2xl flex items-center justify-between transition-all">
                    <div>
                      <p className="font-black text-slate-800 uppercase tracking-tight">{client?.nom} {client?.prenom}</p>
                      <p className="text-[10px] font-bold text-blue-600 uppercase mt-0.5">{app.type_intervention}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">{app.heure}</p>
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
