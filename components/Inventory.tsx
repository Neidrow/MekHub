
import React, { useState, useMemo } from 'react';
import { StockItem, UserRole, StockHistory } from '../types';
import { api } from '../services/api';
import DatePicker from './DatePicker';

interface InventoryProps {
  inventory: StockItem[];
  userRole: UserRole;
  onAddItem: (item: Omit<StockItem, 'id' | 'user_id'>) => Promise<void>;
  onUpdateItem: (id: string, updates: Partial<StockItem>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

const CATEGORIES = [
  { id: 'Piece', label: 'Pièce', color: 'bg-blue-600', icon: '🔧' },
  { id: 'Consommable', label: 'Consommable', color: 'bg-emerald-500', icon: '💧' },
  { id: 'Produit', label: 'Produit', color: 'bg-purple-600', icon: '🛒' },
  { id: 'Autre', label: 'Autre', color: 'bg-slate-700', icon: '📦' }
];

const Inventory: React.FC<InventoryProps> = ({ inventory, userRole, onAddItem, onUpdateItem, onDeleteItem }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  
  // History States
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<StockHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<StockItem | null>(null);

  // Restock States
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<StockItem | null>(null);
  const [restockData, setRestockData] = useState({
    type: 'add' as 'add' | 'remove',
    quantity: 1,
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tout');
  const [loading, setLoading] = useState(false);
  
  // States pour la suppression
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [newItem, setNewItem] = useState({
    reference: '',
    nom: '',
    categorie: 'Piece',
    quantite: '0',
    seuil_alerte: '5',
    prix_achat: '0',
    prix_vente: '0',
    fournisseur: '',
    notes: ''
  });

  const isPremium = userRole === 'user_premium' || userRole === 'super_admin';

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.nom.toLowerCase().includes(search.toLowerCase()) || 
                          item.reference.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeFilter === 'Tout' || item.categorie === activeFilter;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, search, activeFilter]);

  const alertCount = useMemo(() => inventory.filter(i => i.quantite <= i.seuil_alerte).length, [inventory]);

  const openEditModal = (item: StockItem) => {
    setEditingItem(item);
    setNewItem({
      reference: item.reference,
      nom: item.nom,
      categorie: item.categorie,
      quantite: item.quantite.toString(),
      seuil_alerte: item.seuil_alerte.toString(),
      prix_achat: item.prix_achat.toString(),
      prix_vente: item.prix_vente.toString(),
      fournisseur: item.fournisseur,
      notes: item.notes
    });
    setIsModalOpen(true);
  };

  const openRestockModal = (item: StockItem) => {
    setRestockItem(item);
    setRestockData({
      type: 'add',
      quantity: 1,
      date: new Date().toISOString().split('T')[0],
      note: ''
    });
    setIsRestockModalOpen(true);
  };

  const openHistoryModal = async (item: StockItem) => {
    setSelectedHistoryItem(item);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await api.fetchStockHistory(item.id);
      setHistoryData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        reference: newItem.reference,
        nom: newItem.nom,
        categorie: newItem.categorie,
        quantite: parseInt(newItem.quantite) || 0,
        seuil_alerte: parseInt(newItem.seuil_alerte) || 5,
        prix_achat: parseFloat(newItem.prix_achat) || 0,
        prix_vente: parseFloat(newItem.prix_vente) || 0,
        fournisseur: newItem.fournisseur,
        notes: newItem.notes
      };

      if (editingItem) {
        // Détecter changement de quantité pour l'historique
        const diff = payload.quantite - editingItem.quantite;
        if (diff !== 0) {
          await api.addStockHistory({
            item_id: editingItem.id,
            change_amount: diff,
            new_quantity: payload.quantite,
            reason: diff > 0 ? 'Correction manuelle (Ajout)' : 'Correction manuelle (Retrait)',
            created_at: new Date().toISOString()
          });
        }
        await onUpdateItem(editingItem.id, payload);
      } else {
        const createdItem = await onAddItem(payload);
        // @ts-ignore
        if (createdItem?.id) {
           await api.addStockHistory({
             // @ts-ignore
             item_id: createdItem.id,
             change_amount: payload.quantite,
             new_quantity: payload.quantite,
             reason: 'Création initiale',
             created_at: new Date().toISOString()
           });
        }
      }
      
      closeModal();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem) return;
    setLoading(true);
    try {
      const change = restockData.type === 'add' ? restockData.quantity : -restockData.quantity;
      const newStock = restockItem.quantite + change;
      
      await onUpdateItem(restockItem.id, { quantite: newStock });
      
      await api.addStockHistory({
        item_id: restockItem.id,
        change_amount: change,
        new_quantity: newStock,
        reason: restockData.note || (restockData.type === 'add' ? 'Réapprovisionnement' : 'Sortie de stock'),
        created_at: new Date(restockData.date).toISOString()
      });

      setIsRestockModalOpen(false);
      setRestockItem(null);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour du stock.");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setNewItem({
      reference: '', nom: '', categorie: 'Piece', quantite: '0', seuil_alerte: '5',
      prix_achat: '0', prix_vente: '0', fournisseur: '', notes: ''
    });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleteLoading(true);
    try {
      await onDeleteItem(itemToDelete.id);
      setItemToDelete(null);
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Impossible de supprimer cet article.");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden text-center">
        {/* ... (Premium overlay unchanged) ... */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50 rounded-full -ml-32 -mb-32 blur-3xl opacity-50"></div>
        
        <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl mb-8 transform rotate-3 mx-auto">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Gestion Visuelle du Stock</h2>
        <p className="text-slate-500 mt-4 max-w-md font-medium leading-relaxed mx-auto">
          Passez à la version <span className="text-amber-600 font-black">Premium</span> pour débloquer la vue par colonnes, le suivi des alertes visuelles et la catégorisation avancée de vos pièces.
        </p>
        
        <div className="mt-10 p-2 bg-slate-50 rounded-2xl flex flex-col sm:flex-row gap-2">
           <button className="px-8 py-4 bg-slate-900 text-white rounded-xl font-black shadow-xl hover:bg-black transition-all text-xs uppercase tracking-widest">Voir les tarifs</button>
           <button className="px-8 py-4 bg-white text-slate-600 border border-slate-200 rounded-xl font-black hover:bg-slate-50 transition-all text-xs uppercase tracking-widest">En savoir plus</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* --- Modal Historique --- */}
      {isHistoryOpen && selectedHistoryItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setIsHistoryOpen(false)}>
          <div className="bg-white rounded-3xl sm:rounded-[2.5rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="text-xl font-black text-slate-800">Historique</h3>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest truncate max-w-[200px]">{selectedHistoryItem.nom}</p>
               </div>
               <button onClick={() => setIsHistoryOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             
             <div className="p-6 overflow-y-auto">
                {historyLoading ? (
                  <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>
                ) : historyData.length === 0 ? (
                  <p className="text-center text-slate-400 font-medium py-10">Aucun mouvement enregistré.</p>
                ) : (
                  <div className="space-y-4">
                    {historyData.map((h) => (
                      <div key={h.id} className="flex gap-4 items-start">
                         <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${h.change_amount > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                         <div className="flex-1 pb-4 border-b border-slate-50 last:border-0">
                            <div className="flex justify-between items-start">
                               <p className="font-bold text-slate-800 text-sm">{h.reason || 'Mise à jour'}</p>
                               <span className={`text-xs font-black ${h.change_amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                 {h.change_amount > 0 ? '+' : ''}{h.change_amount}
                               </span>
                            </div>
                            <div className="flex justify-between items-end mt-1">
                               <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{new Date(h.created_at).toLocaleDateString()} à {new Date(h.created_at).toLocaleTimeString().slice(0,5)}</p>
                               <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold">Stock: {h.new_quantity}</span>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* --- Modal Réapprovisionnement --- */}
      {isRestockModalOpen && restockItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setIsRestockModalOpen(false)}>
          <div className="bg-white rounded-3xl sm:rounded-[2.5rem] w-full max-w-md shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="text-xl font-black text-slate-800">Mouvement de Stock</h3>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest truncate max-w-[200px]">{restockItem.nom}</p>
               </div>
               <button onClick={() => setIsRestockModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             
             <form onSubmit={handleRestockSubmit} className="p-6 space-y-6 overflow-y-auto">
                {/* Type de mouvement */}
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                   <button 
                     type="button" 
                     onClick={() => setRestockData({...restockData, type: 'add'})} 
                     className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${restockData.type === 'add' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                   >
                     Entrée (+)
                   </button>
                   <button 
                     type="button" 
                     onClick={() => setRestockData({...restockData, type: 'remove'})} 
                     className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${restockData.type === 'remove' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
                   >
                     Sortie (-)
                   </button>
                </div>

                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantité</label>
                      <input required type="number" min="1" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-center text-lg" value={restockData.quantity} onChange={e => setRestockData({...restockData, quantity: parseInt(e.target.value) || 1})} />
                   </div>
                   
                   <div className="space-y-1">
                      <DatePicker 
                        label="Date du mouvement"
                        required
                        value={restockData.date}
                        onChange={(date) => setRestockData({...restockData, date})}
                      />
                   </div>

                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Note / Raison</label>
                      <textarea placeholder="Ex: Livraison fournisseur, Casse..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm h-20" value={restockData.note} onChange={e => setRestockData({...restockData, note: e.target.value})} />
                   </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                   <span className="text-xs font-black text-slate-500 uppercase tracking-wide">Nouveau Stock :</span>
                   <span className="text-2xl font-black text-slate-900">
                      {restockItem.quantite + (restockData.type === 'add' ? restockData.quantity : -restockData.quantity)}
                   </span>
                </div>

                <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs">
                   {loading ? "Mise à jour..." : "Confirmer le mouvement"}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* --- Modal Suppression --- */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setItemToDelete(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-300 flex flex-col" onClick={(e) => e.stopPropagation()}>
             <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </div>
             <h3 className="text-xl font-black text-slate-800 text-center mb-2">Supprimer cet article ?</h3>
             <p className="text-slate-500 text-center text-sm mb-8 leading-relaxed">
               Attention, cette action est <span className="font-bold text-rose-600">irréversible</span>. L'article <span className="font-bold text-slate-700">{itemToDelete.nom}</span> sera retiré du stock.
             </p>
             <div className="flex flex-col gap-3">
               <button onClick={confirmDelete} disabled={deleteLoading} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                 {deleteLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Supprimer définitivement"}
               </button>
               <button onClick={() => setItemToDelete(null)} disabled={deleteLoading} className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs">Annuler</button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Ajout / Edition */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={closeModal}>
          <div className="bg-white rounded-3xl sm:rounded-[2.5rem] w-full max-w-xl shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">{editingItem ? 'Modifier l\'article' : 'Ajouter un article'}</h2>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catégorie</label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat.id} 
                      type="button"
                      onClick={() => setNewItem({...newItem, categorie: cat.id})}
                      className={`py-3 px-2 rounded-xl border-2 font-bold text-[10px] uppercase tracking-tighter transition-all ${newItem.categorie === cat.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Référence</label>
                  <input required placeholder="REF-001" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold uppercase" value={newItem.reference} onChange={e => setNewItem({...newItem, reference: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Désignation</label>
                  <input required placeholder="ex: Filtre à Huile" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newItem.nom} onChange={e => setNewItem({...newItem, nom: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock</label>
                  <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-center" value={newItem.quantite} onChange={e => setNewItem({...newItem, quantite: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seuil Alerte</label>
                  <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-center" value={newItem.seuil_alerte} onChange={e => setNewItem({...newItem, seuil_alerte: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">P. Achat HT</label>
                  <input required type="number" step="0.01" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-center" value={newItem.prix_achat} onChange={e => setNewItem({...newItem, prix_achat: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">P. Vente HT</label>
                  <input required type="number" step="0.01" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-center" value={newItem.prix_vente} onChange={e => setNewItem({...newItem, prix_vente: e.target.value})} />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                {loading ? "Chargement..." : editingItem ? "Mettre à jour" : "Enregistrer l'article"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 11m8 4V11" /></svg>
             </div>
             <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Gestion du Stock</h1>
             <span className="bg-amber-100 text-amber-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">Premium</span>
          </div>
          <p className="text-slate-500 font-medium mt-1">{inventory.length} article{inventory.length > 1 ? 's' : ''} • <span className={alertCount > 0 ? 'text-rose-500 font-bold' : ''}>{alertCount} alerte{alertCount > 1 ? 's' : ''}</span></p>
        </div>
        <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
          Nouvel article
        </button>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
           <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           <input 
              type="text" 
              placeholder="Rechercher un article..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm focus:bg-white transition-all"
           />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
           <button onClick={() => setActiveFilter('Tout')} className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeFilter === 'Tout' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>Tout</button>
           {CATEGORIES.map(cat => (
             <button key={cat.id} onClick={() => setActiveFilter(cat.id)} className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all border whitespace-nowrap ${activeFilter === cat.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}>
                {cat.label}
             </button>
           ))}
        </div>
      </div>

      {/* Colonnes de Stock */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {CATEGORIES.map(cat => {
          const items = filteredInventory.filter(i => i.categorie === cat.id);
          return (
            <div key={cat.id} className="flex flex-col gap-4">
              {/* En-tête de catégorie */}
              <div className={`${cat.color} p-6 rounded-[2.5rem] text-white shadow-xl shadow-slate-200 flex flex-col items-start gap-1 relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:rotate-12 transition-transform">{cat.icon}</div>
                <div className="text-2xl mb-1">{cat.icon}</div>
                <h3 className="text-xl font-black">{cat.label}</h3>
                <p className="text-[10px] font-black uppercase opacity-75">{items.length} article{items.length > 1 ? 's' : ''}</p>
              </div>

              {/* Liste d'articles dans la catégorie */}
              <div className="bg-white/50 rounded-[2.5rem] p-3 space-y-3 min-h-[300px] border border-slate-50">
                {items.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-xs font-black text-slate-300 italic">Aucun article</p>
                  </div>
                ) : (
                  items.map(item => {
                    const isAlert = item.quantite <= item.seuil_alerte;
                    const stockPercent = Math.min((item.quantite / (item.seuil_alerte * 3)) * 100, 100);
                    
                    return (
                      <div key={item.id} className={`p-5 bg-white rounded-[2rem] border-2 shadow-sm transition-all hover:shadow-md ${isAlert ? 'border-rose-100' : 'border-slate-50'}`}>
                         <div className="flex items-center gap-3 mb-4">
                            <div className={`w-8 h-8 rounded-full blur-[2px] opacity-70 ${isAlert ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                            <div className="min-w-0">
                               <h4 className="text-sm font-black text-slate-800 truncate">{item.nom}</h4>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.reference}</p>
                            </div>
                         </div>
                         
                         <div className="space-y-2 mb-4">
                            <div className="flex justify-between items-end">
                               <span className="text-[9px] font-black text-slate-400 uppercase">Stock: <span className={isAlert ? 'text-rose-500' : 'text-slate-800'}>{item.quantite}</span></span>
                               <span className="text-[9px] font-black text-slate-400 uppercase">Seuil: {item.seuil_alerte}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                               <div 
                                  className={`h-full rounded-full transition-all duration-1000 ${isAlert ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                  style={{ width: `${stockPercent}%` }}
                               ></div>
                            </div>
                         </div>

                         <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                            <div className="flex gap-1.5">
                               <button onClick={() => openRestockModal(item)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Réapprovisionner">
                                  {/* Nouvelle Icône : Flèche en zig-zag (type graphique boursier) */}
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                               </button>
                               <button onClick={() => openHistoryModal(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Historique">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                               </button>
                               <button onClick={() => openEditModal(item)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-all" title="Éditer">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                               </button>
                            </div>
                            <button 
                              onClick={() => setItemToDelete(item)}
                              className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" 
                              title="Supprimer"
                            >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                         </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Inventory;
