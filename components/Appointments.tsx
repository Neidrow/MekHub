import React from 'react';
import { RendezVous, Client, Vehicule } from '../types';

interface AppointmentsProps {
  appointments: RendezVous[];
  customers: Client[];
  vehicles: Vehicule[];
}

const Appointments: React.FC<AppointmentsProps> = ({ appointments, customers, vehicles }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-xl lg:text-2xl font-bold text-slate-800">Gestion des Rendez-vous</h3>
        <button className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Nouveau Rendez-vous
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {appointments.map((app) => {
          const customer = customers.find(c => c.id === app.client_id);
          const vehicle = vehicles.find(v => v.id === app.vehicule_id);
          
          return (
            <div key={app.id} className="bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-xl ${
                  app.statut === 'termine' ? 'bg-emerald-50 text-emerald-600' : 
                  app.statut === 'en_cours' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  <svg className="w-5 lg:w-6 h-5 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${
                  app.statut === 'termine' ? 'bg-emerald-50 text-emerald-600' : 
                  app.statut === 'en_cours' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {app.statut === 'en_cours' ? 'En cours' : 
                   app.statut === 'en_attente' ? 'En attente' :
                   app.statut === 'termine' ? 'Terminé' : 'Annulé'}
                </span>
              </div>
              
              <h4 className="text-base lg:text-lg font-bold text-slate-800 line-clamp-1">{app.type_intervention}</h4>
              <p className="text-xs lg:text-sm text-slate-500 mt-1 line-clamp-2">{app.description}</p>
              
              <div className="mt-5 lg:mt-6 space-y-3">
                <div className="flex items-center gap-3 text-xs lg:text-sm">
                  <div className="w-4 h-4 text-slate-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <span className="text-slate-600 font-bold truncate">{customer?.nom} {customer?.prenom}</span>
                </div>
                <div className="flex items-center gap-3 text-xs lg:text-sm">
                  <div className="w-4 h-4 text-slate-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.6 2 11.8 2 12v4c0 .6.4 1 1 1h2" /></svg>
                  </div>
                  <span className="text-slate-600 font-medium truncate">{vehicle?.marque} {vehicle?.modele} • {vehicle?.immatriculation}</span>
                </div>
                <div className="flex items-center gap-3 text-xs lg:text-sm">
                  <div className="w-4 h-4 text-slate-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <span className="text-slate-600 font-medium">{app.date} à {app.heure}</span>
                </div>
              </div>

              <div className="mt-5 lg:mt-6 pt-5 lg:pt-6 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs lg:text-sm font-bold text-slate-400 uppercase tracking-tight">Durée estimée</span>
                <span className="text-base lg:text-xl font-black text-slate-800">{app.duree}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Appointments;