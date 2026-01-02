
import React, { useState, useEffect } from 'react';
import { Client } from '../types';

interface CustomersProps {
  customers: Client[];
  onAddCustomer: (customer: Omit<Client, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onUpdateCustomer: (id: string, updates: Partial<Client>) => Promise<void>;
}

const Customers: React.FC<CustomersProps> = ({ customers, onAddCustomer, onUpdateCustomer }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    notes: ''
  });

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={handleClose}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-10 border-b border-slate-50 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{editingCustomer ? 'Modifier le Client' : 'Nouveau Client'}</h2>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Fiche signalétique</p>
              </div>
              <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
                  <input required placeholder="ex: DUPONT" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
                  <input required placeholder="ex: Jean" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email professionnel</label>
                <input required type="email" placeholder="jean.dupont@email.com" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
                <input required placeholder="06 12 34 56 78" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse (Optionnel)</label>
                <input placeholder="ex: 12 rue de la Paix, 75000 Paris" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700" value={formData.adresse} onChange={e => setFormData({...formData, adresse: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes internes</label>
                <textarea placeholder="Observations particulières..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700 h-24" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h3 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Fichier Clients</h3>
           <p className="text-slate-500 font-medium text-sm mt-1">Gérez vos relations clients et adresses.</p>
        </div>
        <button onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">Nouveau Client</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identité</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Coordonnées & Adresse</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {c.nom.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm uppercase">{c.nom}</p>
                        <p className="text-[10px] font-bold text-slate-400 capitalize">{c.prenom}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <p className="text-xs font-bold text-slate-600">{c.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        <p className="text-[10px] font-bold text-slate-400">{c.telephone}</p>
                      </div>
                      {c.adresse && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-50 mt-1">
                           <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                           <p className="text-[10px] font-bold text-slate-400 truncate max-w-[200px]">{c.adresse}</p>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => handleEdit(c)}
                      className="p-3 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Customers;
