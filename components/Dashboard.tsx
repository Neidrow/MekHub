
import React, { useState, useMemo } from 'react';
import { Client, Vehicule, RendezVous, ViewState } from '../types';

interface DashboardProps {
  customers: Client[];
  vehicles: Vehicule[];
  appointments: RendezVous[];
  onAddAppointment: (app: Omit<RendezVous, 'id' | 'user_id'>) => void;
  onNavigate: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ customers, vehicles, appointments, onAddAppointment, onNavigate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRDV, setNewRDV] = useState({
    client_id: '',
    vehicule_id: '',
    type_intervention: '',
    date: new Date().toISOString().split('T')[0],
    heure: '09:00',
    description: '',
    notes: ''
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
    { label: 'Clients', value: customers.length, target: 'customers' as ViewState, color: 'blue' },
    { label: 'Véhicules', value: vehicles.length, target: 'vehicles' as ViewState, color: 'green' },
    { label: "RDV Aujourd'hui", value: todayAppointments.length, target: 'appointments' as ViewState, color: 'purple' },
    { label: 'Alertes Stock', value: 0, target: 'inventory' as ViewState, color: 'orange' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddAppointment({
      ...newRDV,
      duree: '1h',
      statut: 'en_attente'
    });
    setIsModalOpen(false);
    setNewRDV({
      client_id: '',
      vehicule_id: '',
      type_intervention: '',
      date: todayStr,
      heure: '09:00',
      description: '',
      notes: ''
    });
  };

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-500">
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl p-8">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Nouveau RDV</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <select required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={newRDV.client_id} onChange={e => setNewRDV({...newRDV, client_id: e.target.value})}>
                <option value="">Sélectionner un client</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
              </select>
              <select required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={newRDV.vehicule_id} onChange={e => setNewRDV({...newRDV, vehicule_id: e.target.value})}>
                <option value="">Sélectionner un véhicule</option>
                {vehicles.filter(v => v.client_id === newRDV.client_id).map(v => (
                  <option key={v.id} value={v.id}>{v.marque} {v.modele} ({v.immatriculation})</option>
                ))}
              </select>
              <input required type="text" placeholder="Type d'intervention" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={newRDV.type_intervention} onChange={e => setNewRDV({...newRDV, type_intervention: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={newRDV.date} onChange={e => setNewRDV({...newRDV, date: e.target.value})} />
                <input type="time" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={newRDV.heure} onChange={e => setNewRDV({...newRDV, heure: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg">Enregistrer</button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-4xl font-extrabold text-[#1e293b]">Tableau de bord</h1>
          <p className="text-slate-500 mt-1">{currentDate}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">Nouveau RDV</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} onClick={() => onNavigate(stat.target)} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all">
            <p className="text-slate-500 font-semibold text-sm">{stat.label}</p>
            <h3 className="text-3xl font-black text-[#1e293b]">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
          <h2 className="text-xl font-bold text-[#1e293b] mb-6">RDV du jour</h2>
          <div className="space-y-4">
            {todayAppointments.length === 0 ? (
              <p className="text-slate-400 text-center py-10">Aucun rendez-vous aujourd'hui</p>
            ) : (
              todayAppointments.map(app => {
                const client = customers.find(c => c.id === app.client_id);
                const vehicle = vehicles.find(v => v.id === app.vehicule_id);
                return (
                  <div key={app.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{client?.nom} {client?.prenom}</p>
                      <p className="text-xs text-slate-500">{vehicle?.marque} {vehicle?.modele} • {app.type_intervention}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-blue-600">{app.heure}</p>
                      <span className="text-[10px] uppercase font-bold text-slate-400">{app.statut}</span>
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
