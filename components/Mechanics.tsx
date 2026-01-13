
import React, { useState, useEffect } from 'react';
import { Mecanicien, MechanicStatus } from '../types';

interface MechanicsProps {
  mechanics: Mecanicien[];
  onAdd: (m: Omit<Mecanicien, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Mecanicien>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const Mechanics: React.FC<MechanicsProps> = ({ mechanics, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMech, setEditingMech] = useState<Mecanicien | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    nom: '', 
    prenom: '', 
    statut: 'disponible' as MechanicStatus 
  });

  useEffect(() => {
    if (editingMech) {
      setFormData({
        nom: editingMech.nom,
        prenom: editingMech.prenom,
        statut: editingMech.statut
      });
    } else {
      setFormData({ nom: '', prenom: '', statut: 'disponible' });
    }
  }, [editingMech]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingMech) {
        await onUpdate(editingMech.id, formData);
      } else {
        await onAdd(formData);
      }
      handleClose();
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingMech(null);
  };

  const handleEdit = (m: Mecanicien) => {
    setEditingMech(m);
    setIsModalOpen(true);
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
      case 'en_intervention': return 'En cours';
      case 'absent': return 'Absent';
      default: return status;
    }
  };

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-500">
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={handleClose}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800">{editingMech ? 'Modifier le Collaborateur' : 'Nouveau Collaborateur'}</h2>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Gestion des ressources atelier</p>
              </div>
              <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
                  <input required placeholder="ex: DUPONT" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
                  <input required placeholder="ex: Marc" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Statut Actuel</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.statut} onChange={e => setFormData({...formData, statut: e.target.value as MechanicStatus})}>
                  <option value="disponible">Disponible</option>
                  <option value="en_intervention">En intervention</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all">
                {loading ? "Enregistrement..." : editingMech ? "Mettre à jour" : "Ajouter à l'équipe"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Équipe Technique</h3>
          <p className="text-slate-500 text-sm font-medium mt-1">Gérez vos forces de travail et affectations.</p>
        </div>
        <button onClick={() => { setEditingMech(null); setIsModalOpen(true); }} className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
           Nouveau Collaborateur
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {mechanics.length === 0 ? (
           <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
             <p className="text-slate-400 font-black italic uppercase text-xs tracking-widest">Aucun technicien dans l'équipe</p>
           </div>
        ) : (
          mechanics.map(m => (
            <div key={m.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group animate-in zoom-in duration-300 flex flex-col justify-between h-full relative">
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all text-xl">
                    {m.prenom.charAt(0)}{m.nom.charAt(0)}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white shadow-sm ${getStatusColor(m.statut)}`}></div>
                </div>
                <div className="min-w-0">
                  <p className="font-black text-slate-800 text-lg uppercase truncate leading-tight">{m.prenom} {m.nom}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Disponibilité</p>
                   <p className="text-xs font-bold text-slate-700">{getStatusLabel(m.statut)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(m)} className="p-3 text-blue-500 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => { if(confirm('Supprimer ce collaborateur ?')) onDelete(m.id); }} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
