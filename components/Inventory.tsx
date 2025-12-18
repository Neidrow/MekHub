
import React, { useState } from 'react';
import { StockItem } from '../types';

interface InventoryProps {
  inventory: StockItem[];
  onAddItem: (item: Omit<StockItem, 'id' | 'user_id'>) => void;
}

const Inventory: React.FC<InventoryProps> = ({ inventory, onAddItem }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    reference: '',
    nom: '',
    categorie: '',
    quantite: '0',
    seuil_alerte: '5',
    prix_achat: '0',
    prix_vente: '0',
    fournisseur: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddItem({
      reference: newItem.reference,
      nom: newItem.nom,
      categorie: newItem.categorie,
      quantite: parseInt(newItem.quantite) || 0,
      seuil_alerte: parseInt(newItem.seuil_alerte) || 5,
      prix_achat: parseFloat(newItem.prix_achat) || 0,
      prix_vente: parseFloat(newItem.prix_vente) || 0,
      fournisseur: newItem.fournisseur,
      notes: newItem.notes
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Ajouter au Stock</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Référence" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={newItem.reference} onChange={e => setNewItem({...newItem, reference: e.target.value})} />
              <input required placeholder="Nom de l'article" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={newItem.nom} onChange={e => setNewItem({...newItem, nom: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Catégorie" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={newItem.categorie} onChange={e => setNewItem({...newItem, categorie: e.target.value})} />
                <input required type="number" placeholder="Quantité" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={newItem.quantite} onChange={e => setNewItem({...newItem, quantite: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Prix Achat" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={newItem.prix_achat} onChange={e => setNewItem({...newItem, prix_achat: e.target.value})} />
                <input placeholder="Prix Vente" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={newItem.prix_vente} onChange={e => setNewItem({...newItem, prix_vente: e.target.value})} />
              </div>
              <input placeholder="Fournisseur" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={newItem.fournisseur} onChange={e => setNewItem({...newItem, fournisseur: e.target.value})} />
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg">Ajouter</button>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-slate-800">Gestion des Stocks</h3>
        <button onClick={() => setIsModalOpen(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg">Ajouter une Pièce</button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase">Pièce</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase">Référence</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase">Stock</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase">Prix Vente</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase text-right">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inventory.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-8 py-5 font-bold text-slate-700">{item.nom}</td>
                <td className="px-8 py-5 text-sm text-slate-400 font-bold">{item.reference}</td>
                <td className="px-8 py-5 text-sm text-slate-800 font-black">{item.quantite}</td>
                <td className="px-8 py-5 text-sm text-slate-800 font-black">{item.prix_vente} €</td>
                <td className="px-8 py-5 text-right">
                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${item.quantite <= item.seuil_alerte ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {item.quantite <= item.seuil_alerte ? 'Réappro obligatoire' : 'Disponible'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
