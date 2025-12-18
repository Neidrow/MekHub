
import React, { useState } from 'react';
import { Client } from '../types';

interface CustomersProps {
  customers: Client[];
  onAddCustomer: (customer: Omit<Client, 'id' | 'user_id' | 'created_at'>) => void;
}

const Customers: React.FC<CustomersProps> = ({ customers, onAddCustomer }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCust, setNewCust] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCustomer(newCust);
    setIsModalOpen(false);
    setNewCust({ nom: '', prenom: '', email: '', telephone: '', adresse: '', notes: '' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-10 lg:p-12">
            <h2 className="text-3xl font-black text-slate-800 mb-2">Nouveau Client</h2>
            <p className="text-slate-500 mb-8 font-medium">Enregistrez les coordonnées pour la facturation et les relances.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
                  <input required placeholder="ex: DUPONT" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700" value={newCust.nom} onChange={e => setNewCust({...newCust, nom: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
                  <input required placeholder="ex: Jean" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700" value={newCust.prenom} onChange={e => setNewCust({...newCust, prenom: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <input required type="email" placeholder="jean.dupont@email.com" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700" value={newCust.email} onChange={e => setNewCust({...newCust, email: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
                <input required placeholder="06 12 34 56 78" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700" value={newCust.telephone} onChange={e => setNewCust({...newCust, telephone: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse</label>
                <input placeholder="123 Rue de la Réussite, 75000 Paris" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700" value={newCust.adresse} onChange={e => setNewCust({...newCust, adresse: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes internes</label>
                <textarea placeholder="Client fidèle, préfère être rappelé le matin..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700 h-24" value={newCust.notes} onChange={e => setNewCust({...newCust, notes: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-4">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all">Annuler</button>
                 <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">Créer le client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
           <h3 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Fichier Clients</h3>
           <p className="text-slate-500 font-medium text-sm mt-1">Accédez à l'historique et aux coordonnées de vos clients.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">Nouveau Client</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Client</th>
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Coordonnées</th>
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Adresse</th>
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Gestion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-lg">
                      {c.nom.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-lg uppercase">{c.nom}</p>
                      <p className="text-sm font-bold text-slate-500 capitalize">{c.prenom}</p>
                    </div>
                  </div>
                </td>
                <td className="px-10 py-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                       <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                       <span className="text-sm">{c.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                       <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                       <span className="text-sm">{c.telephone}</span>
                    </div>
                  </div>
                </td>
                <td className="px-10 py-6">
                  <p className="text-sm font-bold text-slate-500 max-w-xs">{c.adresse || 'N/A'}</p>
                </td>
                <td className="px-10 py-6 text-right">
                   <div className="flex justify-end gap-2">
                      <button className="p-3 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button className="p-3 text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-600 hover:text-white transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Customers;
