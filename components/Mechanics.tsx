
import React, { useState } from 'react';
import { Mecanicien, MechanicStatus } from '../types';

interface MechanicsProps {
  mechanics: Mecanicien[];
  onAdd: (m: Omit<Mecanicien, 'id' | 'user_id'>) => void;
}

const Mechanics: React.FC<MechanicsProps> = ({ mechanics, onAdd }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMech, setNewMech] = useState({ 
    nom: '', 
    prenom: '', 
    specialite: '',
    statut: 'disponible' as MechanicStatus 
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(newMech);
    setIsModalOpen(false);
    setNewMech({ nom: '', prenom: '', specialite: '', statut: 'disponible' });
  };

  const getStatusColor = (status: MechanicStatus) => {
    switch (status) {
      case 'disponible': return 'bg-emerald-500';
      case 'en_intervention': return 'bg-amber-500';
      case 'absent': return 'bg-rose-500';
      default: return 'bg-slate-500';
    }
  };

  const getStatusLabel = (status: MechanicStatus) => {
    switch (status) {
      case 'disponible': return 'Disponible';
      case 'en_intervention': return 'En intervention';
      case 'absent': return 'Absent';
      default: return status;
    }
  };

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-500">
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl p-8">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Nouveau Collaborateur</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Nom" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" value={newMech.nom} onChange={e => setNewMech({...newMech, nom: e.target.value})} />
                <input required placeholder="Prénom" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" value={newMech.prenom} onChange={e => setNewMech({...newMech, prenom: e.target.value})} />
              </div>
              <input required placeholder="Spécialité (ex: Électricien, Moteur...)" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" value={newMech.specialite} onChange={e => setNewMech({...newMech, specialite: e.target.value})} />
              <select className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={newMech.statut} onChange={e => setNewMech({...newMech, statut: e.target.value as MechanicStatus})}>
                <option value="disponible">Disponible</option>
                <option value="en_intervention">En intervention</option>
                <option value="absent">Absent</option>
              </select>
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                Ajouter à l'équipe
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Équipe Technique</h3>
          <p className="text-slate-500 text-sm font-medium mt-1">Gérez la disponibilité de vos mécaniciens</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">
          Nouveau Collaborateur
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {mechanics.length === 0 ? (
          <div className="col-span-full py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <p className="text-slate-400 font-bold">Aucun mécanicien enregistré</p>
          </div>
        ) : (
          mechanics.map(m => (
            <div key={m.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-400 font-black text-xl group-hover:from-blue-600 group-hover:to-indigo-700 group-hover:text-white transition-all duration-300">
                    {m.nom.charAt(0)}{m.prenom.charAt(0)}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-white ${getStatusColor(m.statut)}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-lg truncate">{m.prenom} {m.nom}</p>
                  <p className="text-xs text-blue-600 font-black uppercase tracking-widest">{m.specialite || 'Polyvalent'}</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">État actuel</p>
                  <p className="text-sm font-bold text-slate-700">{getStatusLabel(m.statut)}</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-blue-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-rose-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Mechanics;
