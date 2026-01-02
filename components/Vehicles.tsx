
import React, { useState, useEffect } from 'react';
import { Vehicule, Client } from '../types';

interface VehiclesProps {
  vehicles: Vehicule[];
  customers: Client[];
  onAdd: (v: Omit<Vehicule, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Vehicule>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const Vehicles: React.FC<VehiclesProps> = ({ vehicles, customers, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicule | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: '',
    marque: '',
    modele: '',
    immatriculation: '',
    vin: '',
    annee: new Date().getFullYear(),
    couleur: '',
    kilometrage: 0
  });

  useEffect(() => {
    if (editingVehicle) {
      setFormData({
        client_id: editingVehicle.client_id || '',
        marque: editingVehicle.marque || '',
        modele: editingVehicle.modele || '',
        immatriculation: editingVehicle.immatriculation || '',
        vin: editingVehicle.vin || '',
        annee: editingVehicle.annee || new Date().getFullYear(),
        couleur: editingVehicle.couleur || '',
        kilometrage: editingVehicle.kilometrage || 0
      });
    } else {
      setFormData({
        client_id: '', marque: '', modele: '', immatriculation: '', vin: '',
        annee: new Date().getFullYear(), couleur: '', kilometrage: 0
      });
    }
  }, [editingVehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingVehicle) {
        await onUpdate(editingVehicle.id, formData);
      } else {
        await onAdd(formData);
      }
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  const handleEdit = (v: Vehicule) => {
    setEditingVehicle(v);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={handleClose}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{editingVehicle ? 'Modifier le Véhicule' : 'Nouveau Véhicule'}</h2>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Saisie des données techniques</p>
              </div>
              <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto scrollbar-hide">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Propriétaire</label>
                <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                  <option value="">Sélectionner un client</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marque</label>
                  <input required placeholder="ex: Renault" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.marque} onChange={e => setFormData({...formData, marque: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modèle</label>
                  <input required placeholder="ex: Clio IV" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.modele} onChange={e => setFormData({...formData, modele: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Immatriculation</label>
                  <input required placeholder="AA-123-BB" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold uppercase" value={formData.immatriculation} onChange={e => setFormData({...formData, immatriculation: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Année</label>
                  <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.annee} onChange={e => setFormData({...formData, annee: parseInt(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kilométrage actuel</label>
                  <div className="relative">
                    <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold pr-12" value={formData.kilometrage} onChange={e => setFormData({...formData, kilometrage: parseInt(e.target.value)})} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">km</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Couleur</label>
                  <input placeholder="ex: Noir" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.couleur} onChange={e => setFormData({...formData, couleur: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Numéro VIN (Optionnel)</label>
                <input placeholder="Numéro de châssis" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold uppercase tracking-wider" value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value.toUpperCase()})} />
              </div>

              <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                {loading ? "Chargement..." : editingVehicle ? "Mettre à jour la fiche" : "Ajouter au parc"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Parc Automobile</h3>
          <p className="text-slate-500 font-medium text-sm mt-1">Gérez le suivi technique et l'historique de chaque véhicule.</p>
        </div>
        <button onClick={() => { setEditingVehicle(null); setIsModalOpen(true); }} className="w-full sm:w-auto px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
          Nouveau Véhicule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.length === 0 ? (
          <div className="col-span-full py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
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
              <div key={v.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 flex flex-col hover:shadow-xl transition-all group overflow-hidden relative animate-in zoom-in duration-300">
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
                    <p className="text-sm font-black text-slate-800 capitalize">{v.couleur || 'N/A'}</p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs font-black shadow-sm group-hover:text-blue-600 transition-colors">
                      {owner?.nom?.charAt(0) || owner?.prenom?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Propriétaire</p>
                      <p className="text-sm font-bold text-slate-700 truncate">{owner ? `${owner.nom} ${owner.prenom}` : 'Inconnu'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(v)} className="p-3 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => { if(confirm('Supprimer ce véhicule ?')) onDelete(v.id); }} className="p-3 text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
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
