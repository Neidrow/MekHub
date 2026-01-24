
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<StockHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<StockItem | null>(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<StockItem | null>(null);
  const [restockData, setRestockData] = useState({ type: 'add' as 'add' | 'remove', quantity: 1, date: new Date().toISOString().split('T')[0], note: '' });
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tout');
  const [loading, setLoading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [newItem, setNewItem] = useState({ reference: '', nom: '', categorie: 'Piece', quantite: '0', seuil_alerte: '5', prix_achat: '0', prix_vente: '0', fournisseur: '', notes: '' });

  const isPremium = userRole === 'user_premium' || userRole === 'super_admin';

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.nom.toLowerCase().includes(search.toLowerCase()) || item.reference.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeFilter === 'Tout' || item.categorie === activeFilter;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, search, activeFilter]);

  const alertCount = useMemo(() => inventory.filter(i => i.quantite <= i.seuil_alerte).length, [inventory]);

  const closeModal = () => { setIsModalOpen(false); setEditingItem(null); setNewItem({ reference: '', nom: '', categorie: 'Piece', quantite: '0', seuil_alerte: '5', prix_achat: '0', prix_vente: '0', fournisseur: '', notes: '' }); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { reference: newItem.reference, nom: newItem.nom, categorie: newItem.categorie, quantite: parseInt(newItem.quantite) || 0, seuil_alerte: parseInt(newItem.seuil_alerte) || 5, prix_achat: parseFloat(newItem.prix_achat) || 0, prix_vente: parseFloat(newItem.prix_vente) || 0, fournisseur: newItem.fournisseur, notes: newItem.notes };
      if (editingItem) await onUpdateItem(editingItem.id, payload);
      else await onAddItem(payload);
      closeModal();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (!isPremium) return <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 text-center shadow-sm"> <h2 className="text-3xl font-black mb-4">Stock Premium</h2><p className="text-slate-500 mb-8 max-w-md">Débloquez la gestion visuelle du stock avec l'abonnement Premium.</p></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Modals placeholders... */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
             <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gestion du Stock</h1>
             <span className="bg-amber-100 text-amber-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">Premium</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">{inventory.length} articles • <span className={alertCount > 0 ? 'text-rose-500 font-bold' : ''}>{alertCount} alertes</span></p>
        </div>
        <button id="tour-add-item" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>Nouvel article
        </button>
      </div>

      <div id="tour-filters-inventory" className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full"><input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-12 pr-6 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-2xl outline-none font-bold text-sm" /></div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide">
           <button onClick={() => setActiveFilter('Tout')} className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase ${activeFilter === 'Tout' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>Tout</button>
           {CATEGORIES.map(cat => (<button key={cat.id} onClick={() => setActiveFilter(cat.id)} className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase border transition-all ${activeFilter === cat.id ? 'bg-slate-900 text-white' : 'bg-white'}`}>{cat.label}</button>))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {CATEGORIES.map(cat => (
          <div key={cat.id} className="flex flex-col gap-4">
            <div className={`${cat.color} p-6 rounded-[2.5rem] text-white shadow-xl`}>
              <h3 className="text-xl font-black">{cat.label}</h3>
              <p className="text-[10px] font-black uppercase opacity-75">{filteredInventory.filter(i => i.categorie === cat.id).length} articles</p>
            </div>
            <div className="bg-white/50 dark:bg-slate-900/50 rounded-[2.5rem] p-3 space-y-3 min-h-[100px] border border-slate-100 dark:border-slate-800">
              {filteredInventory.filter(i => i.categorie === cat.id).map(item => (
                <div key={item.id} className={`p-5 bg-white dark:bg-slate-900 rounded-[2rem] border-2 shadow-sm ${item.quantite <= item.seuil_alerte ? 'border-rose-100' : 'border-slate-50 dark:border-slate-800'}`}>
                   <h4 className="text-sm font-black truncate">{item.nom}</h4>
                   <p className="text-[9px] font-black text-slate-400 uppercase">{item.reference}</p>
                   <div className="mt-4 flex justify-between items-center"><span className="text-xs font-black">Stock: {item.quantite}</span><div className="flex gap-1"><button onClick={() => { setRestockItem(item); setIsRestockModalOpen(true); }} className="p-2 text-emerald-600 bg-emerald-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></button></div></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Inventory;
