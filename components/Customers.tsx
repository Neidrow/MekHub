
import React, { useState, useEffect, useMemo } from 'react';
import { Client } from '../types';

interface CustomersProps {
  customers: Client[];
  onAddCustomer: (customer: Omit<Client, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onUpdateCustomer: (id: string, updates: Partial<Client>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
}

const Customers: React.FC<CustomersProps> = ({ customers, onAddCustomer, onUpdateCustomer, onDeleteCustomer }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  
  // States pour la suppression
  const [customerToDelete, setCustomerToDelete] = useState<Client | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // States pour la recherche
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    notes: ''
  });

  // Filtrage des clients
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telephone.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        nom: editingCustomer.nom || '',
        prenom: editingCustomer.prenom || '',
        email: editingCustomer.email || '',
        telephone: editingCustomer.telephone || '',
        adresse: editingCustomer.adresse || '',
        notes: editingCustomer.notes || ''
      });
    } else {
      setFormData({ nom: '', prenom: '', email: '', telephone: '', adresse: '', notes: '' });
    }
  }, [editingCustomer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingCustomer) {
        await onUpdateCustomer(editingCustomer.id, formData);
      } else {
        await onAddCustomer(formData);
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
    setEditingCustomer(null);
  };

  const handleEdit = (customer: Client) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (customer: Client) => {
    setCustomerToDelete(customer);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    setDeleteLoading(true);
    try {
      await onDeleteCustomer(customerToDelete.id);
      setCustomerToDelete(null); 
    } catch (err) {
      console.error("Erreur suppression client:", err);
      alert("Une erreur est survenue lors de la suppression.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Modal Suppression Sécurisé */}
      {customerToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setCustomerToDelete(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-300 flex flex-col border dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
             <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </div>
             <h3 className="text-xl font-black text-slate-800 dark:text-white text-center mb-2">Supprimer ce client ?</h3>
             <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-8 leading-relaxed">
               Attention, cette action est <span className="font-bold text-rose-600 dark:text-rose-400">irréversible</span>. Toutes les données associées (véhicules, historiques) seront perdues.
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
                 onClick={() => setCustomerToDelete(null)}
                 disabled={deleteLoading}
                 className="w-full py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs"
               >
                 Annuler
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Edition / Création */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={handleClose}>
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{editingCustomer ? 'Modifier le Client' : 'Nouveau Client'}</h2>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Fiche signalétique</p>
              </div>
              <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
                  <input required placeholder="ex: DUPONT" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700 dark:text-slate-200" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
                  <input required placeholder="ex: Jean" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700 dark:text-slate-200" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email professionnel</label>
                <input required type="email" placeholder="jean.dupont@email.com" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700 dark:text-slate-200" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
                <input required placeholder="06 12 34 56 78" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700 dark:text-slate-200" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse (Optionnel)</label>
                <input placeholder="ex: 12 rue de la Paix, 75000 Paris" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700 dark:text-slate-200" value={formData.adresse} onChange={e => setFormData({...formData, adresse: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes internes</label>
                <textarea placeholder="Observations particulières..." className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700 dark:text-slate-200 h-24" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
              <div className="pt-4">
                 <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                   {loading ? "Chargement..." : editingCustomer ? "Enregistrer les modifications" : "Créer le client"}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header avec Recherche et Action */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
           <h3 className="text-2xl lg:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Fichier Clients</h3>
           <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Gérez votre base de données clients.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          {/* Barre de recherche */}
          <div className="relative flex-1 sm:w-80">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder="Rechercher (Nom, Tél...)" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all shadow-sm"
            />
          </div>

          <button onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
            Nouveau Client
          </button>
        </div>
      </div>

      {/* Liste des clients */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Identité</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Adresse</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </div>
                      <p className="text-slate-400 dark:text-slate-500 font-bold">Aucun client trouvé</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 font-black text-lg group-hover:bg-blue-600 group-hover:text-white dark:group-hover:text-white transition-all shadow-sm">
                          {c.nom.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight">{c.nom}</p>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 capitalize">{c.prenom}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          </span>
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{c.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          </span>
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{c.telephone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {c.adresse ? (
                        <div className="flex items-start gap-2">
                           <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                           </span>
                           <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-[250px]">{c.adresse}</p>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-wide">Non renseignée</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(c)}
                          className="p-3 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all shadow-sm"
                          title="Modifier"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(c)}
                          className="p-3 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-xl hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-all shadow-sm"
                          title="Supprimer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Customers;
