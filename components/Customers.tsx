
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
  const [customerToDelete, setCustomerToDelete] = useState<Client | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({ nom: '', prenom: '', email: '', telephone: '', adresse: '', notes: '' });

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
      setFormData({ nom: editingCustomer.nom || '', prenom: editingCustomer.prenom || '', email: editingCustomer.email || '', telephone: editingCustomer.telephone || '', adresse: editingCustomer.adresse || '', notes: editingCustomer.notes || '' });
    } else {
      setFormData({ nom: '', prenom: '', email: '', telephone: '', adresse: '', notes: '' });
    }
  }, [editingCustomer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingCustomer) await onUpdateCustomer(editingCustomer.id, formData);
      else await onAddCustomer(formData);
      handleClose();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleClose = () => { setIsModalOpen(false); setEditingCustomer(null); };
  const handleEdit = (customer: Client) => { setEditingCustomer(customer); setIsModalOpen(true); };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    setDeleteLoading(true);
    try { await onDeleteCustomer(customerToDelete.id); setCustomerToDelete(null); } catch (err) { alert("Une erreur est survenue."); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {customerToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setCustomerToDelete(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative border dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
             <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
             <h3 className="text-xl font-black text-slate-800 dark:text-white text-center mb-2">Supprimer ce client ?</h3>
             <div className="flex flex-col gap-3 mt-6">
               <button onClick={confirmDelete} disabled={deleteLoading} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs">{deleteLoading ? "..." : "Supprimer"}</button>
               <button onClick={() => setCustomerToDelete(null)} className="w-full py-4 bg-slate-100 dark:bg-slate-800 font-black rounded-2xl uppercase tracking-widest text-xs">Annuler</button>
             </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={handleClose}>
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center shrink-0">
              <div><h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{editingCustomer ? 'Modifier le Client' : 'Nouveau Client'}</h2><p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Fiche signalétique</p></div>
              <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label><input required placeholder="ex: DUPONT" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-2xl font-bold" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value.toUpperCase()})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label><input required placeholder="ex: Jean" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-2xl font-bold" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} /></div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label><input required type="email" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-2xl font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label><input required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-2xl font-bold" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} /></div>
              <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl">{loading ? "Chargement..." : "Enregistrer"}</button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div><h3 className="text-2xl lg:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Fichier Clients</h3><p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Gérez votre base de données clients.</p></div>
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div id="tour-search-customers" className="relative flex-1 sm:w-80">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none shadow-sm" />
          </div>
          <button id="tour-add-customer" onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-blue-700 active:scale-95 flex items-center justify-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>Nouveau Client</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identité</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.length === 0 ? (<tr><td colSpan={3} className="px-6 py-20 text-center"><p className="text-slate-400 font-bold">Aucun client trouvé</p></td></tr>) : 
                filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                    <td className="px-6 py-5"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black">{c.nom.charAt(0)}</div><div><p className="font-black uppercase">{c.nom}</p><p className="text-xs font-bold text-slate-400">{c.prenom}</p></div></div></td>
                    <td className="px-6 py-5"><p className="text-xs font-bold">{c.email}</p><p className="text-xs font-medium text-slate-400">{c.telephone}</p></td>
                    <td className="px-6 py-5 text-right"><div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(c)} className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        <button onClick={() => setCustomerToDelete(c)} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Customers;
