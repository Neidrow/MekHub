import React, { useState, useMemo } from 'react';
import { StockItem, UserRole, StockHistory } from '../types';
import { api } from '../services/api';
import DatePicker from './DatePicker';
import { useLanguage } from '../contexts/LanguageContext';

interface InventoryProps {
  inventory: StockItem[];
  userRole: UserRole;
  onAddItem: (item: Omit<StockItem, 'id' | 'user_id'>) => Promise<void>;
  onUpdateItem: (id: string, updates: Partial<StockItem>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

const Inventory: React.FC<InventoryProps> = ({ inventory, userRole, onAddItem, onUpdateItem, onDeleteItem }) => {
  const { t, locale, language } = useLanguage();
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
  
  const CATEGORIES = useMemo(() => [
    { id: 'Piece', label: t('inventory.cat_part'), color: 'bg-blue-600', icon: '🔧' },
    { id: 'Consommable', label: t('inventory.cat_consumable'), color: 'bg-emerald-500', icon: '💧' },
    { id: 'Produit', label: t('inventory.cat_product'), color: 'bg-purple-600', icon: '🛒' },
    { id: 'Autre', label: t('inventory.cat_other'), color: 'bg-slate-700', icon: '📦' }
  ], [language, t]);

  const filteredInventory = useMemo(() => inventory.filter(item => { 
    const matchesSearch = item.nom.toLowerCase().includes(search.toLowerCase()) || item.reference.toLowerCase().includes(search.toLowerCase()); 
    const matchesCat = activeFilter === 'Tout' || activeFilter === 'All' || item.categorie === activeFilter;
    return matchesSearch && matchesCat; 
  }), [inventory, search, activeFilter]);

  const displayedCategories = useMemo(() => {
    return CATEGORIES;
  }, [CATEGORIES]);

  const alertCount = useMemo(() => inventory.filter(i => i.quantite <= i.seuil_alerte).length, [inventory]);

  const openEditModal = (item: StockItem) => { setEditingItem(item); setNewItem({ reference: item.reference, nom: item.nom, categorie: item.categorie, quantite: item.quantite.toString(), seuil_alerte: item.seuil_alerte.toString(), prix_achat: item.prix_achat.toString(), prix_vente: item.prix_vente.toString(), fournisseur: item.fournisseur, notes: item.notes }); setIsModalOpen(true); };
  const openRestockModal = (item: StockItem) => { setRestockItem(item); setRestockData({ type: 'add', quantity: 1, date: new Date().toISOString().split('T')[0], note: '' }); setIsRestockModalOpen(true); };
  const openHistoryModal = async (item: StockItem) => { setSelectedHistoryItem(item); setIsHistoryOpen(true); setHistoryLoading(true); try { const data = await api.fetchStockHistory(item.id); setHistoryData(data); } catch (e) { console.error(e); } finally { setHistoryLoading(false); } };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { reference: newItem.reference, nom: newItem.nom, categorie: newItem.categorie, quantite: parseInt(newItem.quantite) || 0, seuil_alerte: parseInt(newItem.seuil_alerte) || 5, prix_achat: parseFloat(newItem.prix_achat) || 0, prix_vente: parseFloat(newItem.prix_vente) || 0, fournisseur: newItem.fournisseur, notes: newItem.notes };
      if (editingItem) { const diff = payload.quantite - editingItem.quantite; if (diff !== 0) { await api.addStockHistory({ item_id: editingItem.id, change_amount: diff, new_quantity: payload.quantite, reason: diff > 0 ? 'Correction' : 'Correction', created_at: new Date().toISOString() }); } await onUpdateItem(editingItem.id, payload); }
      else { const createdItem = await onAddItem(payload); if (createdItem?.id) { await api.addStockHistory({ item_id: createdItem.id, change_amount: payload.quantite, new_quantity: payload.quantite, reason: 'Création', created_at: new Date().toISOString() }); } }
      closeModal();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!restockItem) return; setLoading(true); try { const change = restockData.type === 'add' ? restockData.quantity : -restockData.quantity; const newStock = restockItem.quantite + change; await onUpdateItem(restockItem.id, { quantite: newStock }); await api.addStockHistory({ item_id: restockItem.id, change_amount: change, new_quantity: newStock, reason: restockData.note || (restockData.type === 'add' ? t('inventory.move_in') : t('inventory.move_out')), created_at: new Date(restockData.date).toISOString() }); setIsRestockModalOpen(false); setRestockItem(null); } catch (err) { alert(t('common.error_save')); } finally { setLoading(false); } };
  const closeModal = () => { setIsModalOpen(false); setEditingItem(null); setNewItem({ reference: '', nom: '', categorie: 'Piece', quantite: '0', seuil_alerte: '5', prix_achat: '0', prix_vente: '0', fournisseur: '', notes: '' }); };
  const confirmDelete = async () => { if (!itemToDelete) return; setDeleteLoading(true); try { await onDeleteItem(itemToDelete.id); setItemToDelete(null); } catch (error) { alert(t('common.error_delete')); } finally { setDeleteLoading(false); } };

  if (!isPremium) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden text-center"><div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 dark:bg-blue-900/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div><div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50 dark:bg-purple-900/10 rounded-full -ml-32 -mb-32 blur-3xl opacity-50"></div><div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl mb-8 transform rotate-3 mx-auto"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div><h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Gestion Visuelle du Stock</h2><p className="text-slate-500 dark:text-slate-400 mt-4 max-w-md font-medium leading-relaxed mx-auto">Passez à la version <span className="text-amber-600 dark:text-amber-400 font-black">Premium</span> pour débloquer la vue par colonnes, le suivi des alertes visuelles et la catégorisation avancée de vos pièces.</p><div className="mt-10 p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col sm:flex-row gap-2"><button className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black shadow-xl hover:bg-black dark:hover:bg-slate-100 transition-all text-xs uppercase tracking-widest">Voir les tarifs</button><button className="px-8 py-4 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs uppercase tracking-widest">En savoir plus</button></div></div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {isHistoryOpen && selectedHistoryItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setIsHistoryOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[2.5rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[80vh] overflow-hidden border dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
             <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50"><div><h3 className="text-xl font-black text-slate-800 dark:text-white">{t('inventory.modal_history_title')}</h3><p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{selectedHistoryItem.nom}</p></div><button onClick={() => setIsHistoryOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
             <div className="p-6 overflow-y-auto">{historyLoading ? (<div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>) : historyData.length === 0 ? (<p className="text-center text-slate-400 font-medium py-10">{t('common.none')}.</p>) : (<div className="space-y-4">{historyData.map((h) => (<div key={h.id} className="flex gap-4 items-start"><div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${h.change_amount > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div><div className="flex-1 pb-4 border-b border-slate-50 dark:border-slate-800 last:border-0"><div className="flex justify-between items-start"><p className="font-bold text-slate-800 dark:text-white text-sm">{h.reason || 'Mise à jour'}</p><span className={`text-xs font-black ${h.change_amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{h.change_amount > 0 ? '+' : ''}{h.change_amount}</span></div><div className="flex justify-between items-end mt-1"><p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">{new Date(h.created_at).toLocaleDateString(locale)}</p><span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-bold">Stock: {h.new_quantity}</span></div></div></div>))}</div>)}</div>
          </div>
        </div>
      )}

      {isRestockModalOpen && restockItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setIsRestockModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[2.5rem] w-full max-w-md shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[90vh] overflow-hidden border dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
             <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50"><div><h3 className="text-xl font-black text-slate-800 dark:text-white">{t('inventory.modal_restock_title')}</h3><p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{restockItem.nom}</p></div><button onClick={() => setIsRestockModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
             <form onSubmit={handleRestockSubmit} className="p-6 space-y-6 overflow-y-auto">
               <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                 <button type="button" onClick={() => setRestockData({...restockData, type: 'add'})} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${restockData.type === 'add' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-400'}`}>{t('inventory.move_in')}</button>
                 <button type="button" onClick={() => setRestockData({...restockData, type: 'remove'})} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${restockData.type === 'remove' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-400'}`}>{t('inventory.move_out')}</button>
               </div>
               <div className="space-y-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('inventory.form_qty')}</label>
                   <input type="number" min="1" required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={restockData.quantity} onChange={e => setRestockData({...restockData, quantity: parseInt(e.target.value) || 0})} />
                 </div>
                 <div className="space-y-1">
                   <DatePicker label={t('inventory.form_date')} value={restockData.date} onChange={d => setRestockData({...restockData, date: d})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('inventory.form_reason')}</label>
                   <input placeholder="ex: Livraison fournisseur..." className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={restockData.note} onChange={e => setRestockData({...restockData, note: e.target.value})} />
                 </div>
               </div>
               <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">{loading ? t('common.loading') : t('common.save')}</button>
             </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={closeModal}>
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-xl font-black text-slate-800 dark:text-white">{editingItem ? t('inventory.form_save_edit') : t('inventory.add_btn')}</h2>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('inventory.form_ref')}</label><input required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newItem.reference} onChange={e => setNewItem({...newItem, reference: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('inventory.form_name')}</label><input required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newItem.nom} onChange={e => setNewItem({...newItem, nom: e.target.value})} /></div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.type')}</label><select className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newItem.categorie} onChange={e => setNewItem({...newItem, categorie: e.target.value})}><option value="Piece">{t('inventory.cat_part')}</option><option value="Consommable">{t('inventory.cat_consumable')}</option><option value="Produit">{t('inventory.cat_product')}</option><option value="Autre">{t('inventory.cat_other')}</option></select></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('inventory.form_stock')}</label><input type="number" required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newItem.quantite} onChange={e => setNewItem({...newItem, quantite: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('inventory.form_threshold')}</label><input type="number" required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newItem.seuil_alerte} onChange={e => setNewItem({...newItem, seuil_alerte: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('inventory.form_buy_price')}</label><input type="number" step="0.01" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newItem.prix_achat} onChange={e => setNewItem({...newItem, prix_achat: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('inventory.form_sell_price')}</label><input type="number" step="0.01" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={newItem.prix_vente} onChange={e => setNewItem({...newItem, prix_vente: e.target.value})} /></div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">{loading ? t('common.loading') : t('common.save')}</button>
            </form>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setItemToDelete(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-300 flex flex-col border dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
             <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
             <h3 className="text-xl font-black text-slate-800 dark:text-white text-center mb-2">{t('common.delete')} ?</h3>
             <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-8">{itemToDelete.nom}</p>
             <div className="flex flex-col gap-3"><button onClick={confirmDelete} disabled={deleteLoading} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">{deleteLoading ? (<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>) : t('common.confirm')}</button><button onClick={() => setItemToDelete(null)} disabled={deleteLoading} className="w-full py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs">{t('common.cancel')}</button></div>
          </div>
        </div>
      )}

      {/* Main UI */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{t('inventory.title')}</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t('inventory.subtitle')}</p>
          </div>
          <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="w-full lg:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>{t('inventory.add_btn')}
          </button>
        </div>

        {/* Stats & Filters */}
        <div id="stock-stats" className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {displayedCategories.map(cat => (
             <div key={cat.id} onClick={() => setActiveFilter(cat.id === activeFilter ? 'Tout' : cat.id)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${activeFilter === cat.id ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                <span className="text-2xl mb-2 block">{cat.icon}</span>
                <p className="text-xs font-black uppercase tracking-widest opacity-60">{cat.label}</p>
                <p className="text-lg font-black">{inventory.filter(i => i.categorie === cat.id).length}</p>
             </div>
           ))}
        </div>

        <div id="stock-list" className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6">
           <input type="text" placeholder={t('inventory.search_placeholder')} value={search} onChange={e => setSearch(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white mb-6" />
           
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
             {filteredInventory.length === 0 ? (
               <div className="col-span-full text-center py-10 text-slate-400 font-bold italic">{t('inventory.no_data')}</div>
             ) : (
               filteredInventory.map(item => {
                 const isAlert = item.quantite <= item.seuil_alerte;
                 return (
                   <div key={item.id} className={`p-5 rounded-2xl border transition-all hover:shadow-lg group relative ${isAlert ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
                      <div className="flex justify-between items-start mb-3">
                         <span className="px-2 py-1 bg-white dark:bg-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-100 dark:border-slate-700">{item.categorie}</span>
                         <div className="flex gap-1">
                            <button onClick={() => openHistoryModal(item)} className="p-2 bg-white dark:bg-slate-900 text-blue-500 rounded-lg hover:text-blue-700 transition-colors shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                            <button onClick={() => openEditModal(item)} className="p-2 bg-white dark:bg-slate-900 text-slate-400 rounded-lg hover:text-slate-700 dark:hover:text-white transition-colors shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                            <button onClick={() => setItemToDelete(item)} className="p-2 bg-white dark:bg-slate-900 text-rose-400 rounded-lg hover:text-rose-600 transition-colors shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                         </div>
                      </div>
                      <h4 className="font-black text-slate-800 dark:text-white text-lg truncate" title={item.nom}>{item.nom}</h4>
                      <p className="text-xs font-bold text-slate-400 mb-4">{item.reference}</p>
                      
                      <div className="flex items-center justify-between mt-auto">
                         <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Prix Vente</p>
                            <p className="font-black text-slate-800 dark:text-white">{item.prix_vente.toFixed(2)} €</p>
                         </div>
                         <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <button onClick={() => { setRestockItem(item); setRestockData({ type: 'remove', quantity: 1, date: new Date().toISOString().split('T')[0], note: '' }); setIsRestockModalOpen(true); }} className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors font-black">-</button>
                            <span className={`font-black text-lg min-w-[2ch] text-center ${isAlert ? 'text-rose-600 animate-pulse' : 'text-slate-800 dark:text-white'}`}>{item.quantite}</span>
                            <button onClick={() => { setRestockItem(item); setRestockData({ type: 'add', quantity: 1, date: new Date().toISOString().split('T')[0], note: '' }); setIsRestockModalOpen(true); }} className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors font-black">+</button>
                         </div>
                      </div>
                   </div>
                 );
               })
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;