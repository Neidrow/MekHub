
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicule, Client, RendezVous, Facture } from '../types';
import { api } from '../services/api';

interface VehiclesProps {
  vehicles: Vehicule[];
  customers: Client[];
  appointments: RendezVous[];
  invoices: Facture[];
  onAdd: (v: Omit<Vehicule, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Vehicule>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const Vehicles: React.FC<VehiclesProps> = ({ vehicles, customers, appointments, invoices, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicule | null>(null);
  const [loading, setLoading] = useState(false);
  
  // History View State
  const [historyVehicle, setHistoryVehicle] = useState<Vehicule | null>(null);
  const [historyTab, setHistoryTab] = useState<'appointments' | 'invoices'>('appointments');

  // States pour la suppression
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicule | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // States pour filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState('');

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

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch = 
        v.immatriculation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.marque.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.modele.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesClient = filterClient ? v.client_id === filterClient : true;

      return matchesSearch && matchesClient;
    });
  }, [vehicles, searchQuery, filterClient]);

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

  const handleViewHistory = (v: Vehicule) => {
    setHistoryVehicle(v);
    setHistoryTab('appointments');
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;
    setDeleteLoading(true);
    try {
      await onDelete(vehicleToDelete.id);
      setVehicleToDelete(null);
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Impossible de supprimer ce véhicule.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtrage des données pour l'historique
  const vehicleAppointments = useMemo(() => {
    if (!historyVehicle) return [];
    return appointments
      .filter(a => a.vehicule_id === historyVehicle.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, historyVehicle]);

  const vehicleInvoices = useMemo(() => {
    if (!historyVehicle) return [];
    return invoices
      .filter(f => f.vehicule_id === historyVehicle.id)
      .sort((a, b) => new Date(b.date_facture).getTime() - new Date(a.date_facture).getTime());
  }, [invoices, historyVehicle]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'termine': case 'payee': return 'bg-emerald-100 text-emerald-700';
      case 'en_cours': case 'en_attente': return 'bg-blue-100 text-blue-700';
      case 'non_payee': return 'bg-amber-100 text-amber-700';
      case 'annule': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* --- Modal Historique Complet --- */}
      {historyVehicle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setHistoryVehicle(null)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800">Dossier Véhicule</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">{historyVehicle.marque} {historyVehicle.modele} - <span className="uppercase">{historyVehicle.immatriculation}</span></p>
              </div>
              <button onClick={() => setHistoryVehicle(null)} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Onglets */}
            <div className="flex border-b border-slate-100">
              <button 
                onClick={() => setHistoryTab('appointments')}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${historyTab === 'appointments' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                Interventions ({vehicleAppointments.length})
              </button>
              <button 
                onClick={() => setHistoryTab('invoices')}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${historyTab === 'invoices' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                Factures ({vehicleInvoices.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 scrollbar-hide">
              {historyTab === 'appointments' ? (
                <div className="space-y-3">
                  {vehicleAppointments.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 italic font-medium">Aucune intervention enregistrée.</div>
                  ) : (
                    vehicleAppointments.map(app => (
                      <div key={app.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="font-black text-slate-800 text-sm">{app.type_intervention}</p>
                          <p className="text-xs text-slate-500 mt-1 font-medium">{new Date(app.date).toLocaleDateString()} à {app.heure}</p>
                          {app.description && <p className="text-xs text-slate-400 mt-1 italic line-clamp-1">{app.description}</p>}
                        </div>
                        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${getStatusBadge(app.statut)}`}>
                          {app.statut.replace('_', ' ')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {vehicleInvoices.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 italic font-medium">Aucune facture enregistrée.</div>
                  ) : (
                    vehicleInvoices.map(inv => (
                      <div key={inv.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="font-black text-slate-800 text-sm">{inv.numero_facture}</p>
                          <p className="text-xs text-slate-500 mt-1 font-medium">{new Date(inv.date_facture).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900 text-sm">{inv.montant_ttc.toFixed(2)} €</p>
                          <span className={`inline-block mt-1 px-3 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${getStatusBadge(inv.statut)}`}>
                            {inv.statut.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Modal Suppression Sécurisé --- */}
      {vehicleToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setVehicleToDelete(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-300 flex flex-col" onClick={(e) => e.stopPropagation()}>
             <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </div>
             <h3 className="text-xl font-black text-slate-800 text-center mb-2">Supprimer ce véhicule ?</h3>
             <p className="text-slate-500 text-center text-sm mb-8 leading-relaxed">
               Attention, cette action est <span className="font-bold text-rose-600">irréversible</span>. Le véhicule <span className="font-bold text-slate-700">{vehicleToDelete.immatriculation}</span> sera effacé ainsi que son historique.
             </p>
             <div className="flex flex-col gap-3">
               <button 
                 onClick={confirmDelete}
                 disabled={deleteLoading}
                 className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
               >
                 {deleteLoading ? (
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 ) : (
                   "Supprimer définitivement"
                 )}
               </button>
               <button 
                 onClick={() => setVehicleToDelete(null)}
                 disabled={deleteLoading}
                 className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
               >
                 Annuler
               </button>
             </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={handleClose}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800">{editingVehicle ? 'Modifier le Véhicule' : 'Nouveau Véhicule'}</h2>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Saisie des données techniques</p>
              </div>
              <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 overflow-y-auto scrollbar-hide">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Propriétaire</label>
                <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                  <option value="">Sélectionner un client</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Immatriculation</label>
                <input required placeholder="AA-123-BB" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black uppercase tracking-wider text-slate-800" value={formData.immatriculation} onChange={e => setFormData({...formData, immatriculation: e.target.value.toUpperCase()})} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marque</label>
                  <input required placeholder="ex: Renault" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.marque} onChange={e => setFormData({...formData, marque: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modèle</label>
                  <input required placeholder="ex: Clio IV" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.modele} onChange={e => setFormData({...formData, modele: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Année</label>
                  <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.annee} onChange={e => setFormData({...formData, annee: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kilométrage actuel</label>
                  <div className="relative">
                    <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold pr-12" value={formData.kilometrage} onChange={e => setFormData({...formData, kilometrage: parseInt(e.target.value)})} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">km</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Couleur</label>
                  <input placeholder="ex: Noir" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.couleur} onChange={e => setFormData({...formData, couleur: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Numéro VIN (Optionnel)</label>
                  <input placeholder="Numéro de châssis" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold uppercase tracking-wider" value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value.toUpperCase()})} />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 mt-2">
                {loading ? "Chargement..." : editingVehicle ? "Mettre à jour la fiche" : "Ajouter au parc"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header & Filtres */}
      <div className="bg-white rounded-[2.5rem] p-6 lg:p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
           <div>
             <h3 className="text-3xl font-black text-slate-800 tracking-tight">Parc Automobile</h3>
             <p className="text-slate-500 font-medium">Gestion technique et historique des véhicules.</p>
           </div>
           <button onClick={() => { setEditingVehicle(null); setIsModalOpen(true); }} className="w-full lg:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
             Nouveau Véhicule
           </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
           {/* Recherche */}
           <div className="relative flex-1">
             <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             <input 
               type="text" 
               placeholder="Rechercher (Plaque, Marque, Modèle...)" 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
             />
           </div>

           {/* Filtre Client */}
           <div className="w-full md:w-72 relative">
              <select 
                 value={filterClient}
                 onChange={e => setFilterClient(e.target.value)}
                 className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 appearance-none transition-all cursor-pointer"
              >
                 <option value="">Tous les clients</option>
                 {customers.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
              </select>
              <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredVehicles.length === 0 ? (
          <div className="col-span-full py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.6 2 11.8 2 12v4c0 .6.4 1 1 1h2" /></svg>
            </div>
            <h4 className="text-xl font-bold text-slate-800">Aucun véhicule trouvé</h4>
            <p className="text-slate-500 mt-2 max-w-xs">Modifiez vos filtres ou ajoutez un nouveau véhicule.</p>
          </div>
        ) : (
          filteredVehicles.map((v) => {
            const owner = customers.find(c => c.id === v.client_id);
            return (
              <div key={v.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative animate-in zoom-in duration-300">
                {/* En-tête Carte */}
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.6 2 11.8 2 12v4c0 .6.4 1 1 1h2m2 0h10" /></svg>
                  </div>
                  <span className="px-3 py-1.5 bg-slate-900 text-white font-black text-[10px] rounded-xl tracking-wider shadow-md">
                      {v.immatriculation || 'NON IMM.'}
                  </span>
                </div>
                
                <h3 className="text-lg font-black text-slate-800 truncate leading-tight">{v.marque} <span className="text-slate-500 font-bold">{v.modele}</span></h3>
                <p className="text-xs font-bold text-slate-400 mt-1">{v.annee} • {v.couleur || 'Couleur N/A'}</p>
                
                <div className="mt-6 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kilométrage</p>
                      <p className="text-sm font-black text-slate-800">{v.kilometrage?.toLocaleString() || 0} km</p>
                   </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-[10px] font-black shadow-sm group-hover:text-blue-600 transition-colors shrink-0">
                      {owner?.nom?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Propriétaire</p>
                      <p className="text-xs font-bold text-slate-700 truncate">{owner ? `${owner.nom} ${owner.prenom}` : 'Inconnu'}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 pl-2">
                    <button 
                      onClick={() => handleViewHistory(v)} 
                      className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all" 
                      title="Historique"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                    <button onClick={() => handleEdit(v)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Modifier">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => setVehicleToDelete(v)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Supprimer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
