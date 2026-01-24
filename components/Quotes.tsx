
import React, { useState, useEffect, useMemo } from 'react';
import { Devis, Client, Vehicule, GarageSettings, InvoiceItem, Facture, UserRole, ViewState, QuoteHistory } from '../types';
import { generateQuotePDF } from '../services/pdfService';
import { api } from '../services/api';
import DatePicker from './DatePicker';

interface QuotesProps {
  devis: Devis[];
  customers: Client[];
  vehicles: Vehicule[];
  settings: GarageSettings | null;
  userRole: UserRole;
  invoices?: Facture[];
  onAdd: (d: Omit<Devis, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Devis>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddInvoice: (f: Omit<Facture, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onNavigate?: (view: ViewState) => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

const Quotes: React.FC<QuotesProps> = ({ devis, customers, vehicles, settings, userRole, invoices = [], onAdd, onUpdate, onDelete, onAddInvoice, onNavigate, onNotify }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevis, setEditingDevis] = useState<Devis | null>(null);
  const [duplicateSource, setDuplicateSource] = useState<Devis | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentModalVat, setCurrentModalVat] = useState<number>(20);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [quoteToConvert, setQuoteToConvert] = useState<Devis | null>(null);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Devis | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<QuoteHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedQuoteForHistory, setSelectedQuoteForHistory] = useState<Devis | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const isPremium = userRole === 'user_premium' || userRole === 'super_admin';
  const generateRef = () => { const now = new Date(); const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, ''); return `D-${now.getFullYear()}-${dateStr.slice(4)}-${timeStr}`; };
  const [formData, setFormData] = useState({ client_id: '', vehicule_id: '', numero_devis: generateRef(), date_devis: new Date().toISOString().split('T')[0], statut: 'brouillon' as Devis['statut'], notes: '' });
  const [items, setItems] = useState<InvoiceItem[]>([{ description: 'Main d\'oeuvre', quantity: 1, unitPrice: 50, total: 50 }]);

  const filteredDevis = useMemo(() => {
    return devis.filter(d => {
      const client = customers.find(c => c.id === d.client_id);
      const clientName = client ? `${client.nom} ${client.prenom}` : '';
      const matchesSearch = d.numero_devis.toLowerCase().includes(searchTerm.toLowerCase()) || clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || d.statut === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [devis, customers, searchTerm, statusFilter]);

  useEffect(() => {
    if (editingDevis) {
      let historicalVat = settings?.tva || 20;
      if (editingDevis.montant_ht > 0) { const calculatedRate = ((editingDevis.montant_ttc - editingDevis.montant_ht) / editingDevis.montant_ht) * 100; historicalVat = Math.round(calculatedRate * 10) / 10; }
      setCurrentModalVat(historicalVat);
      setFormData({ client_id: editingDevis.client_id, vehicule_id: editingDevis.vehicule_id || '', numero_devis: editingDevis.numero_devis, date_devis: editingDevis.date_devis, statut: editingDevis.statut, notes: editingDevis.notes || '' });
      setItems(editingDevis.items && editingDevis.items.length > 0 ? editingDevis.items : [{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    } else if (duplicateSource) {
      setCurrentModalVat(settings?.tva !== undefined ? settings.tva : 20);
      setFormData({ client_id: duplicateSource.client_id, vehicule_id: duplicateSource.vehicule_id || '', numero_devis: generateRef(), date_devis: new Date().toISOString().split('T')[0], statut: 'brouillon', notes: duplicateSource.notes || '' });
      setItems(duplicateSource.items ? JSON.parse(JSON.stringify(duplicateSource.items)) : [{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    } else {
      setCurrentModalVat(settings?.tva !== undefined ? settings.tva : 20);
      setFormData({ client_id: '', vehicule_id: '', numero_devis: generateRef(), date_devis: new Date().toISOString().split('T')[0], statut: 'brouillon', notes: '' });
      setItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    }
  }, [editingDevis, duplicateSource, isModalOpen]);

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => { const newItems = [...items]; const item = { ...newItems[index], [field]: value }; item.total = (item.quantity || 0) * (item.unitPrice || 0); newItems[index] = item; setItems(newItems); };
  const addItem = () => { setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]); };
  const removeItem = (index: number) => { setItems(items.filter((_, i) => i !== index)); };

  const totals = useMemo(() => {
    const ht = items.reduce((acc, item) => acc + (item.total || 0), 0);
    const tva = ht * (currentModalVat / 100);
    return { ht, tva, ttc: ht + tva };
  }, [items, currentModalVat]);

  const handleDuplicate = (d: Devis) => { setEditingDevis(null); setDuplicateSource(d); setIsModalOpen(true); onNotify('info', 'Duplication', 'Une copie du devis a été préparée. Vérifiez les informations avant d\'enregistrer.'); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicule_id) { onNotify("error", "Erreur de saisie", "Veuillez sélectionner un véhicule."); return; }
    setLoading(true);
    try {
      const payload = { ...formData, vehicule_id: formData.vehicule_id, items, montant_ht: totals.ht, montant_ttc: totals.ttc };
      let action = 'creation', details = 'Création du devis';
      if (editingDevis) {
        const changes: string[] = [];
        if (editingDevis.statut !== formData.statut) { action = 'status_change'; changes.push(`Statut: ${editingDevis.statut.toUpperCase()} ➔ ${formData.statut.toUpperCase()}`); } else { action = 'modification'; }
        if (editingDevis.client_id !== formData.client_id) { const oldName = customers.find(c => c.id === editingDevis.client_id)?.nom || '?'; const newName = customers.find(c => c.id === formData.client_id)?.nom || '?'; changes.push(`Client: ${oldName} ➔ ${newName}`); }
        if (editingDevis.vehicule_id !== formData.vehicule_id) changes.push("Véhicule modifié");
        if (editingDevis.date_devis !== formData.date_devis) changes.push(`Date: ${editingDevis.date_devis} ➔ ${formData.date_devis}`);
        items.forEach((newItem, index) => { const oldItem = editingDevis.items[index]; if (!oldItem) { changes.push(`+ Ajout: "${newItem.description}" (${newItem.quantity} x ${newItem.unitPrice}€)`); } else { const diffs = []; if (oldItem.description !== newItem.description) diffs.push(`Nom: "${oldItem.description}"➔"${newItem.description}"`); if (oldItem.quantity !== newItem.quantity) diffs.push(`Qté "${newItem.description}": ${oldItem.quantity}➔${newItem.quantity}`); if (oldItem.unitPrice !== newItem.unitPrice) diffs.push(`Prix "${newItem.description}": ${oldItem.unitPrice}➔${newItem.unitPrice}€`); if (diffs.length > 0) { changes.push(diffs.join(', ')); } } });
        if (editingDevis.items.length > items.length) { for (let i = items.length; i < editingDevis.items.length; i++) { changes.push(`- Suppr: "${editingDevis.items[i].description}"`); } }
        if (changes.length === 0) { if (editingDevis.notes !== formData.notes) { changes.push("Mise à jour des notes"); } else { changes.push("Mise à jour mineure"); } }
        details = changes.join(' | ');
        await onUpdate(editingDevis.id, payload);
        await api.addQuoteHistory({ devis_id: editingDevis.id, user_id: editingDevis.user_id, action, details });
        onNotify("success", "Devis mis à jour", "Les modifications ont été enregistrées.");
      } else {
        const newDevis = await onAdd(payload);
        const creationDetails = duplicateSource ? `Duplication depuis le devis ${duplicateSource.numero_devis} - Montant: ${totals.ttc.toFixed(2)}€` : `Création initiale - Montant: ${totals.ttc.toFixed(2)}€`;
        if (newDevis?.id) { await api.addQuoteHistory({ devis_id: newDevis.id, user_id: newDevis.user_id, action: 'creation', details: creationDetails }); }
        onNotify("success", "Devis créé", "Le nouveau devis a été ajouté.");
      }
      setIsModalOpen(false); setEditingDevis(null); setDuplicateSource(null);
    } catch (err: any) { onNotify("error", "Erreur système", err.message); }
    finally { setLoading(false); }
  };

  const handleConversionClick = (d: Devis) => { if (!d.vehicule_id) { onNotify("error", "Conversion impossible", "Le devis n'a pas de véhicule associé."); return; } setQuoteToConvert(d); };
  const handleViewHistory = async (d: Devis) => { setSelectedQuoteForHistory(d); setIsHistoryOpen(true); setHistoryLoading(true); try { const history = await api.fetchQuoteHistory(d.id); setHistoryData(history); } catch (e) { onNotify('error', 'Erreur', "Impossible de charger l'historique."); } finally { setHistoryLoading(false); } };
  const executeConversion = async () => { if (!quoteToConvert) return; setConversionLoading(true); const d = quoteToConvert; try { const invoiceRef = `F${(d.numero_devis || 'REF').substring(1)}`; const today = new Date().toISOString().split('T')[0]; const newInvoice = { client_id: d.client_id, vehicule_id: d.vehicule_id, numero_facture: invoiceRef, date_facture: today, items: d.items ? JSON.parse(JSON.stringify(d.items)) : [], montant_ht: d.montant_ht || 0, tva: (d.montant_ttc || 0) - (d.montant_ht || 0), montant_ttc: d.montant_ttc || 0, acompte: 0, montant_paye: 0, statut: 'brouillon' as Facture['statut'], notes: `Facture générée depuis le devis ${d.numero_devis}. ${d.notes || ''}` }; await onAddInvoice(newInvoice); setQuoteToConvert(null); onNotify("success", "Conversion réussie !", "Le devis a été transformé en facture brouillon."); if (onNavigate) onNavigate('invoices'); } catch (error: any) { onNotify("error", "Erreur de conversion", "Impossible de créer la facture."); } finally { setConversionLoading(false); } };
  const handleDownloadPDF = (d: Devis) => { if (!settings) { onNotify("error", "Configuration manquante", "Configurez les paramètres avant de télécharger."); return; } const client = customers.find(c => c.id === d.client_id); const vehicule = vehicles.find(v => v.id === d.vehicule_id); const doc = generateQuotePDF(d, client, vehicule, settings); doc.save(`Devis_${d.numero_devis}.pdf`); };

  const handleSendEmail = async (d: Devis) => {
    const client = customers.find(c => c.id === d.client_id);
    const vehicule = vehicles.find(v => v.id === d.vehicule_id);
    if (!client || !client.email) { onNotify("error", "Email manquant", "Le client n'a pas d'adresse email renseignée."); return; }
    setSendingEmail(d.id);
    try {
      let appUrl = window.location.origin;
      if (!appUrl || appUrl === 'null' || appUrl.includes('localhost') || appUrl.includes('127.0.0.1')) { appUrl = 'https://garage-pro-eight.vercel.app'; }
      if (appUrl.endsWith('/')) { appUrl = appUrl.slice(0, -1); }
      const validationLink = `${appUrl}/?view=public_quote&id=${d.id}`;
      const garageName = settings?.nom || 'Votre Garage';
      const subject = encodeURIComponent(`Devis ${d.numero_devis} - ${garageName} - Action requise`);
      const vehiculeInfo = vehicule ? `${vehicule.marque} ${vehicule.modele}` : 'votre véhicule';
      const body = encodeURIComponent(`Bonjour ${client.prenom} ${client.nom}, Veuillez trouver ci-dessous le lien pour consulter et valider votre devis...`);
      const mailtoLink = `mailto:${client.email}?subject=${subject}&body=${body}`;
      window.location.href = mailtoLink;
      await onUpdate(d.id, { statut: 'en_attente' });
      await api.addQuoteHistory({ devis_id: d.id, user_id: d.user_id, action: 'email_sent', details: 'Email envoyé au client avec lien de signature' });
      onNotify("success", "Messagerie ouverte", "L'email a été pré-rempli avec le bon lien de signature.");
    } catch (err: any) { onNotify("error", "Erreur d'envoi", err.message); }
    finally { setSendingEmail(null); }
  };

  const confirmDelete = async () => { if (!quoteToDelete) return; setDeleteLoading(true); try { await onDelete(quoteToDelete.id); setQuoteToDelete(null); onNotify("success", "Suppression réussie", "Le devis a été supprimé."); } catch (error) { onNotify("error", "Erreur", "Impossible de supprimer ce devis."); } finally { setDeleteLoading(false); } };
  const getStatusColor = (s: Devis['statut']) => { switch(s) { case 'brouillon': return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'; case 'en_attente': return 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'; case 'accepte': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'; case 'refuse': return 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'; default: return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'; } };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isHistoryOpen && selectedQuoteForHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setIsHistoryOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[80vh] overflow-hidden border dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
             <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50"><div><h3 className="text-xl font-black text-slate-800 dark:text-white">Historique détaillé</h3><p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{selectedQuoteForHistory.numero_devis}</p></div><button onClick={() => setIsHistoryOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
             <div className="p-6 overflow-y-auto">{historyLoading ? (<div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>) : historyData.length === 0 ? (<p className="text-center text-slate-400 font-medium py-10">Aucun historique disponible.</p>) : (<div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">{historyData.map((h, idx) => (<div key={idx} className="relative pl-8"><div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${h.action === 'creation' ? 'bg-blue-500' : h.action === 'signed' ? 'bg-emerald-500' : h.action === 'email_sent' ? 'bg-indigo-500' : 'bg-slate-400'}`}></div><p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider mb-1">{new Date(h.created_at).toLocaleDateString()} à {new Date(h.created_at).toLocaleTimeString().slice(0,5)}</p><div className="text-sm text-slate-700 dark:text-slate-300 font-medium">{h.details.split('|').map((line, i) => (<p key={i} className="mb-0.5 last:mb-0">{line.trim().startsWith('+') ? <span className="text-emerald-600 dark:text-emerald-400 font-bold">{line.trim()}</span> : line.trim().startsWith('-') ? <span className="text-rose-600 dark:text-rose-400 font-bold">{line.trim()}</span> : line.trim()}</p>))}</div></div>))}</div>)}</div>
          </div>
        </div>
      )}

      {quoteToConvert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => !conversionLoading && setQuoteToConvert(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-300 flex flex-col items-center text-center border dark:border-slate-800" onClick={(e) => e.stopPropagation()}><div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></div><h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Convertir en Facture ?</h3><p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">Vous allez créer une nouvelle facture basée sur le devis <span className="font-bold text-slate-800 dark:text-white">{quoteToConvert.numero_devis}</span>.</p><div className="flex flex-col gap-3 w-full"><button onClick={executeConversion} disabled={conversionLoading} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">{conversionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Confirmer la conversion"}</button><button onClick={() => setQuoteToConvert(null)} disabled={conversionLoading} className="w-full py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs">Annuler</button></div></div>
        </div>
      )}

      {quoteToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setQuoteToDelete(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-300 flex flex-col border dark:border-slate-800" onClick={(e) => e.stopPropagation()}><div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div><h3 className="text-xl font-black text-slate-800 dark:text-white text-center mb-2">Supprimer ce devis ?</h3><div className="flex flex-col gap-3 mt-6"><button onClick={confirmDelete} disabled={deleteLoading} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">{deleteLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Supprimer définitivement"}</button><button onClick={() => setQuoteToDelete(null)} disabled={deleteLoading} className="w-full py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs">Annuler</button></div></div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div><h3 className="text-2xl font-black text-[#1e293b] dark:text-white">Gestion des Devis</h3><p className="text-slate-500 dark:text-slate-400 font-medium">Créez et suivez vos devis clients.</p></div>
          <button id="tour-add-quote" onClick={() => { setEditingDevis(null); setIsModalOpen(true); }} className="w-full lg:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>Nouveau Devis</button>
        </div>

        <div id="tour-quote-filters" className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
           <div className="relative flex-1"><svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><input type="text" placeholder="Rechercher (Client, Référence...)" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all" /></div>
           <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"><button onClick={() => setStatusFilter('all')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${statusFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Tout</button><button onClick={() => setStatusFilter('brouillon')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${statusFilter === 'brouillon' ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Brouillon</button><button onClick={() => setStatusFilter('en_attente')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${statusFilter === 'en_attente' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>En Attente</button><button onClick={() => setStatusFilter('accepte')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${statusFilter === 'accepte' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Accepté</button><button onClick={() => setStatusFilter('refuse')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${statusFilter === 'refuse' ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Refusé</button></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Référence</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Client</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Montant TTC</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Statut</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDevis.length === 0 ? (<tr><td colSpan={6} className="py-20 text-center"><p className="text-slate-400 dark:text-slate-500 font-bold italic">Aucun devis trouvé</p></td></tr>) : (
                filteredDevis.map((d) => {
                  const client = customers.find(c => c.id === d.client_id);
                  const isSending = sendingEmail === d.id;
                  const isAlreadyConverted = invoices.some(inv => inv.notes?.includes(d.numero_devis));
                  const isLocked = d.statut === 'accepte' || d.statut === 'refuse';
                  return (<tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group"><td className="px-6 py-5 font-bold text-slate-700 dark:text-slate-200">{d.numero_devis}</td><td className="px-6 py-5 font-bold text-slate-800 dark:text-white">{client ? `${client.nom} ${client.prenom}` : 'Client Inconnu'}</td><td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-400">{d.date_devis}</td><td className="px-6 py-5 font-black text-slate-900 dark:text-white">{d.montant_ttc.toFixed(2)} €</td><td className="px-6 py-5"><span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${getStatusColor(d.statut)}`}>{d.statut.replace('_', ' ')}</span></td><td className="px-6 py-5 text-right flex justify-end gap-2">{!isLocked && (<button onClick={() => handleSendEmail(d)} disabled={isSending || d.statut === 'en_attente'} className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider border ${d.statut === 'en_attente' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 cursor-default' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 dark:hover:bg-indigo-600 dark:hover:text-white'}`} title="Envoyer par Email">{isSending ? (<div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></div>) : d.statut === 'en_attente' ? (<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> Envoyé</>) : (<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> Envoyer</>)}</button>)}{d.statut === 'accepte' && (isAlreadyConverted ? (<div className="px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider border text-emerald-700 bg-emerald-100 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 flex items-center gap-2 cursor-default"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>Facturé</div>) : (<button onClick={(e) => { e.stopPropagation(); handleConversionClick(d); }} className="px-3 py-2 rounded-lg transition-all flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider border text-white bg-emerald-600 hover:bg-emerald-700 border-emerald-600 shadow-sm shadow-emerald-200 dark:shadow-none animate-pulse" title="Convertir en Facture"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>Convertir</button>))}<button onClick={() => handleDuplicate(d)} className="p-2 text-violet-600 hover:text-violet-800 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-400 rounded-lg transition-all dark:hover:bg-violet-500/20" title="Dupliquer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg></button><button onClick={() => handleViewHistory(d)} className="p-2 text-blue-500 hover:text-blue-700 bg-blue-50 dark:bg-blue-500/10 rounded-lg transition-all dark:hover:bg-blue-500/20" title="Historique"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button><button onClick={() => handleDownloadPDF(d)} className="p-2 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:text-white dark:hover:bg-slate-700 transition-all" title="Télécharger"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button><button onClick={() => { if(!isLocked) { setEditingDevis(d); setIsModalOpen(true); } }} disabled={isLocked} className={`p-2 rounded-lg transition-all ${isLocked ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed bg-slate-50 dark:bg-slate-800' : 'text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20'}`} title={isLocked ? "Modification impossible (Verrouillé)" : "Modifier"}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button><button onClick={() => setQuoteToDelete(d)} className="p-2 text-rose-600 hover:text-rose-800 bg-rose-50 rounded-lg transition-all dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20" title="Supprimer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td></tr>);
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Quotes;
