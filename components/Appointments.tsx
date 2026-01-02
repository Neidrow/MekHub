
import React, { useState, useEffect } from 'react';
import { RendezVous, Client, Vehicule, Mecanicien, ViewState } from '../types';

interface AppointmentsProps {
  appointments: RendezVous[];
  customers: Client[];
  vehicles: Vehicule[];
  mecaniciens: Mecanicien[];
  onAddAppointment: (app: Omit<RendezVous, 'id' | 'user_id'>) => Promise<void>;
  onUpdateStatus: (id: string, status: RendezVous['statut']) => Promise<void>;
  onUpdateAppointment: (id: string, updates: Partial<RendezVous>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNavigate: (view: ViewState) => void;
}

const Appointments: React.FC<AppointmentsProps> = ({ 
  appointments, 
  customers, 
  vehicles, 
  mecaniciens, 
  onAddAppointment, 
  onUpdateStatus, 
  onUpdateAppointment, 
  onDelete,
  onNavigate
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRDV, setEditingRDV] = useState<RendezVous | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
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

  // L'automatisation du statut a été retirée pour éviter les conflits avec la saisie manuelle et la synchro Google.

  useEffect(() => {
    if (editingRDV) {
      setFormData({
        client_id: editingRDV.client_id,
        vehicule_id: editingRDV.vehicule_id,
        mecanicien_id: editingRDV.mecanicien_id || '',
        type_intervention: editingRDV.type_intervention,
        date: editingRDV.date,
        heure: editingRDV.heure,
        duree: editingRDV.duree,
        description: editingRDV.description || '',
        notes: editingRDV.notes || '',
        statut: editingRDV.statut
      });
    } else {
      setFormData({
        client_id: '', vehicule_id: '', mecanicien_id: '', type_intervention: '',
        date: new Date().toISOString().split('T')[0], heure: '09:00', duree: '1h', 
        description: '', notes: '', statut: 'en_attente'
      });
    }
    setError('');
  }, [editingRDV, isModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.mecanicien_id) {
      setError('Veuillez affecter un mécanicien.');
      return;
    }
    setLoading(true);
    try {
      if (editingRDV) {
        await onUpdateAppointment(editingRDV.id, formData);
      } else {
        await onAddAppointment(formData);
      }
      handleClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingRDV(null);
    setError('');
  };

  const handleEdit = (app: RendezVous) => {
    setEditingRDV(app);
    setIsModalOpen(true);
  };

  const getStatusStyle = (status: RendezVous['statut']) => {
    switch(status) {
      case 'en_attente': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'en_cours': return 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm';
      case 'termine': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'annule': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const statusLabels: Record<string, string> = {
    'en_attente': 'Planifié',
    'en_cours': 'En cours',
    'termine': 'Terminé',
    'annule': 'Annulé'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={handleClose}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{editingRDV ? 'Modifier l\'intervention' : 'Planifier une intervention'}</h2>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Agenda atelier</p>
              </div>
              <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value, vehicule_id: ''})}>
                    <option value="">Sélectionner</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Véhicule</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.vehicule_id} onChange={e => setFormData({...formData, vehicule_id: e.target.value})}>
                    <option value="">Sélectionner</option>
                    {vehicles.filter(v => v.client_id === formData.client_id).map(v => (
                      <option key={v.id} value={v.id}>{v.immatriculation} - {v.marque} {v.modele}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type d'intervention</label>
                  <input required placeholder="ex: Révision complète" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.type_intervention} onChange={e => setFormData({...formData, type_intervention: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mécanicien affecté</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.mecanicien_id} onChange={e => setFormData({...formData, mecanicien_id: e.target.value})}>
                    <option value="">Affecter un mécanicien</option>
                    {mecaniciens.map(m => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                  <input type="date" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Heure</label>
                  <input type="time" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.heure} onChange={e => setFormData({...formData, heure: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Durée prévue</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.duree} onChange={e => setFormData({...formData, duree: e.target.value})}>
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
                      onClick={() => setFormData({...formData, statut: s})}
                      className={`py-2 px-1 rounded-xl border-2 font-black text-[9px] uppercase tracking-tighter transition-all ${formData.statut === s ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'}`}
                    >
                      {statusLabels[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Notes</label>
                <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold h-24" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase text-center">{error}</div>}

              <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95">
                {loading ? "Enregistrement..." : editingRDV ? "Mettre à jour" : "Confirmer"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">Agenda Atelier</h3>
          <p className="text-slate-500 font-medium">Planifiez et suivez l'état des réparations.</p>
        </div>
        <button onClick={() => { setEditingRDV(null); setIsModalOpen(true); }} className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 active:scale-95 flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
          Nouveau rendez-vous
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {appointments.length === 0 ? (
          <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 italic font-black text-slate-300">
             Aucun rendez-vous planifié
          </div>
        ) : (
          appointments.map((app) => {
            const customer = customers.find(c => c.id === app.client_id);
            const mechanic = mecaniciens.find(m => m.id === app.mecanicien_id);
            const isSynced = !!app.google_event_id;
            
            return (
              <div key={app.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all group flex flex-col h-full relative">
                
                {/* Indicateur Synchro Google */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-sm">
                   <div className={`w-1.5 h-1.5 rounded-full ${isSynced ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                   <span className={`text-[8px] font-black uppercase tracking-widest ${isSynced ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isSynced ? 'Google OK' : 'Non Synchro'}
                   </span>
                </div>

                <div className="flex items-start justify-between mb-6">
                  <div className={`p-3 rounded-2xl border transition-colors ${getStatusStyle(app.statut)}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div className="flex flex-col items-end gap-2 pr-20">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border ${getStatusStyle(app.statut)}`}>
                      {statusLabels[app.statut]}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{app.date} • {app.heure}</span>
                  </div>
                </div>
                
                <h4 className="text-lg font-black text-slate-800 mb-2 line-clamp-1">{app.type_intervention}</h4>
                <p className="text-sm text-slate-500 font-medium mb-6 line-clamp-2">{app.description || 'Intervention planifiée.'}</p>
                
                <div className="space-y-2 mb-8 flex-grow">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 font-black text-xs border border-slate-100">
                      {customer?.nom?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1 tracking-tighter">Client</p>
                      <p className="text-sm font-black text-slate-700 truncate">{customer?.nom} {customer?.prenom}</p>
                    </div>
                  </div>
                  {mechanic && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-[10px]">
                        {mechanic.prenom.charAt(0)}{mechanic.nom.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-blue-400 uppercase leading-none mb-1 tracking-tighter">Mécanicien</p>
                        <p className="text-sm font-black text-blue-900 truncate">{mechanic.prenom} {mechanic.nom}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Durée</span>
                    <span className="text-sm font-black text-slate-900">{app.duree}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(app)} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => { if(confirm('Supprimer ce RDV ?')) onDelete(app.id); }} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">
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

export default Appointments;
