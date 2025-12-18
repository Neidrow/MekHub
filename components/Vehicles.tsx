
import React from 'react';
import { Vehicule, Client } from '../types';

interface VehiclesProps {
  vehicles: Vehicule[];
  customers: Client[];
}

const Vehicles: React.FC<VehiclesProps> = ({ vehicles, customers }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Parc Automobile</h3>
          <p className="text-slate-500 font-medium text-sm mt-1">Gérez le suivi technique et l'historique de chaque véhicule.</p>
        </div>
        <button className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Nouveau Véhicule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.length === 0 ? (
          <div className="col-span-full py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.6 2 11.8 2 12v4c0 .6.4 1 1 1h2" /></svg>
            </div>
            <h4 className="text-xl font-bold text-slate-800">Aucun véhicule enregistré</h4>
            <p className="text-slate-500 mt-2 max-w-xs">Enregistrez les véhicules de vos clients pour commencer le suivi.</p>
          </div>
        ) : (
          vehicles.map((v) => {
            const owner = customers.find(c => c.id === v.client_id);
            return (
              <div key={v.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 flex flex-col hover:shadow-xl transition-all group overflow-hidden relative">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.6 2 11.8 2 12v4c0 .6.4 1 1 1h2m2 0h10" /></svg>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="px-3 py-1 bg-slate-900 text-white font-black text-xs rounded-xl tracking-tight shadow-sm">
                      {v.immatriculation || 'NON IMM.'}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">{v.annee}</span>
                  </div>
                </div>
                
                <h3 className="text-xl font-black text-slate-800 truncate">{v.marque} {v.modele}</h3>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Kilométrage</p>
                    <p className="text-sm font-black text-slate-800">{v.kilometrage?.toLocaleString() || 0} km</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Couleur</p>
                    <div className="flex items-center gap-2">
                       <p className="text-sm font-black text-slate-800 capitalize">{v.couleur || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-5 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Détails techniques</p>
                  <p className="text-xs font-bold text-slate-500 mb-1">N° VIN</p>
                  <p className="text-xs font-black text-slate-800 font-mono tracking-tighter uppercase">{v.vin || 'Non renseigné'}</p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs font-black shadow-sm group-hover:text-blue-600 transition-colors">
                      {owner?.nom?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Propriétaire</p>
                      <p className="text-sm font-bold text-slate-700 truncate">{owner?.nom} {owner?.prenom}</p>
                    </div>
                  </div>
                  <button className="p-3 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Vehicles;
