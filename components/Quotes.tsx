
import React, { useState, useEffect, useMemo } from 'react';
import { Devis, Client, Vehicule, GarageSettings, InvoiceItem, Facture, UserRole, ViewState } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../services/api';
import DatePicker from './DatePicker';

interface QuotesProps {
  devis: Devis[];
  customers: Client[];
  vehicles: Vehicule[];
  settings: GarageSettings | null;
  userRole: UserRole;
  onAdd: (d: Omit<Devis, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Devis>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddInvoice: (f: Omit<Facture, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onNavigate?: (view: ViewState) => void;
}

const Quotes: React.FC<QuotesProps> = ({ devis, customers, vehicles, settings, userRole, onAdd, onUpdate, onDelete, onAddInvoice, onNavigate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevis, setEditingDevis] = useState<Devis | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  
  const [quoteToConvert, setQuoteToConvert] = useState<Devis | null>(null);
  const [conversionLoading, setConversionLoading] = useState(false);

  const [quoteToDelete, setQuoteToDelete] = useState<Devis | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // --- FILTRES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const isPremium = userRole === 'user_premium' || userRole === 'super_admin';

  const generateRef = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, '');
    return `D-${now.getFullYear()}-${dateStr.slice(4)}-${timeStr}`;
  };

  const [formData, setFormData] = useState({
    client_id: '',
    vehicule_id: '',
    numero_devis: generateRef(),
    date_devis: new Date().toISOString().split('T')[0],
    statut: 'brouillon' as Devis['statut'],
    notes: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: 'Main d\'oeuvre', quantity: 1, unitPrice: 50, total: 50 }
  ]);

  // Logique de filtrage
  const filteredDevis = useMemo(() => {
    return devis.filter(d => {
      const client = customers.find(c => c.id === d.client_id);
      const clientName = client ? `${client.nom} ${client.prenom}` : '';
      
      const matchesSearch = 
        d.numero_devis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesStatus = statusFilter === 'all' || d.statut === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [devis, customers, searchTerm, statusFilter]);

  useEffect(() => {
    if (editingDevis) {
      setFormData({
        client_id: editingDevis.client_id,
        vehicule_id: editingDevis.vehicule_id || '', 
        numero_devis: editingDevis.numero_devis,
        date_devis: editingDevis.date_devis,
        statut: editingDevis.statut,
        notes: editingDevis.notes || ''
      });
      setItems(editingDevis.items && editingDevis.items.length > 0 ? editingDevis.items : [{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    } else {
      setFormData({
        client_id: '',
        vehicule_id: '',
        numero_devis: generateRef(),
        date_devis: new Date().toISOString().split('T')[0],
        statut: 'brouillon',
        notes: ''
      });
      setItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    }
  }, [editingDevis]);

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    item.total = (item.quantity || 0) * (item.unitPrice || 0);
    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totals = useMemo(() => {
    const ht = items.reduce((acc, item) => acc + (item.total || 0), 0);
    const tva = ht * 0.20;
    return { ht, tva, ttc: ht + tva };
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicule_id) {
        alert("Veuillez sélectionner un véhicule.");
        return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        vehicule_id: formData.vehicule_id,
        items,
        montant_ht: totals.ht,
        montant_ttc: totals.ttc
      };
      if (editingDevis) {
        // @ts-ignore
        await onUpdate(editingDevis.id, payload);
      } else {
        // @ts-ignore
        await onAdd(payload);
      }
      setIsModalOpen(false);
      setEditingDevis(null);
    } catch (err: any) {
      console.error(err);
      alert(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConversionClick = (d: Devis) => {
    if (!d.vehicule_id) {
      alert("Impossible de convertir : Le devis n'a pas de véhicule associé.");
      return;
    }
    setQuoteToConvert(d);
  };

  const executeConversion = async () => {
    if (!quoteToConvert) return;
    setConversionLoading(true);
    const d = quoteToConvert;
    try {
      const invoiceRef = `F${(d.numero_devis || 'REF').substring(1)}`; 
      const today = new Date().toISOString().split('T')[0];
      const newInvoice = {
        client_id: d.client_id,
        vehicule_id: d.vehicule_id,
        numero_facture: invoiceRef,
        date_facture: today,
        items: d.items ? JSON.parse(JSON.stringify(d.items)) : [],
        montant_ht: d.montant_ht || 0,
        tva: (d.montant_ttc || 0) - (d.montant_ht || 0),
        montant_ttc: d.montant_ttc || 0,
        acompte: 0,
        montant_paye: 0,
        statut: 'brouillon' as Facture['statut'],
        notes: `Facture générée depuis le devis ${d.numero_devis}. ${d.notes || ''}`
      };
      await onAddInvoice(newInvoice);
      await onUpdate(d.id, { statut: 'accepte' });
      setQuoteToConvert(null);
      alert("✅ Facture créée avec succès !");
      if (onNavigate) onNavigate('invoices');
    } catch (error: any) {
      console.error("Erreur conversion:", error);
      alert("Erreur lors de la conversion.");
    } finally {
      setConversionLoading(false);
    }
  };

  // --- PDF Logic ---
  const createPDFDoc = (d: Devis) => {
    const doc = new jsPDF();
    const client = customers.find(c => c.id === d.client_id);
    const vehicule = vehicles.find(v => v.id === d.vehicule_id);

    if (settings?.logo_url) {
      try { doc.addImage(settings.logo_url, 'JPEG', 15, 15, 30, 30); } catch (e) { console.warn("Logo error", e); }
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(settings?.nom || "Garage", 15, 55);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(settings?.adresse || "", 15, 62);
    doc.text(`${settings?.email} | ${settings?.telephone}`, 15, 68);
    doc.text(`SIRET: ${settings?.siret}`, 15, 74);

    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text("DEVIS", 150, 25, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`N° ${d.numero_devis}`, 150, 32, { align: 'right' });
    doc.text(`Date : ${new Date(d.date_devis).toLocaleDateString('fr-FR')}`, 150, 38, { align: 'right' });

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(120, 50, 80, 40, 2, 2, 'F');
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("Client", 125, 58);
    doc.setFont("helvetica", "normal");
    if (client) {
      doc.text(`${client.nom} ${client.prenom}`, 125, 65);
      doc.text(client.adresse || "", 125, 71);
      doc.text(client.telephone || "", 125, 77);
    }

    if (vehicule) {
      doc.setFontSize(9);
      doc.setTextColor(50);
      doc.text(`Véhicule : ${vehicule.marque} ${vehicule.modele} - ${vehicule.immatriculation} (${vehicule.kilometrage} km)`, 15, 90);
    }

    const tableBody = (d.items || []).map(item => [
      item.description, item.quantity, `${item.unitPrice.toFixed(2)} €`, `${item.total.toFixed(2)} €`
    ]);

    autoTable(doc, {
      startY: 100,
      head: [['Description', 'Qté', 'Prix Unit.', 'Total HT']],
      body: tableBody,
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 30, halign: 'right' }, 3: { cellWidth: 30, halign: 'right' } }
    });

    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text(`Total HT :`, 140, finalY);
    doc.text(`${d.montant_ht.toFixed(2)} €`, 190, finalY, { align: 'right' });
    doc.text(`TVA (20%) :`, 140, finalY + 6);
    doc.text(`${(d.montant_ttc - d.montant_ht).toFixed(2)} €`, 190, finalY + 6, { align: 'right' });
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text(`Total TTC :`, 140, finalY + 14);
    doc.text(`${d.montant_ttc.toFixed(2)} €`, 190, finalY + 14, { align: 'right' });

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Document généré par GaragePro SaaS", 105, 290, { align: 'center' });

    return doc;
  };

  const handleDownloadPDF = (d: Devis) => {
    if (!settings) { alert("Configurez les paramètres avant."); return; }
    const doc = createPDFDoc(d);
    doc.save(`Devis_${d.numero_devis}.pdf`);
  };

  const handleSendEmail = async (d: Devis) => {
    const client = customers.find(c => c.id === d.client_id);
    const vehicule = vehicles.find(v => v.id === d.vehicule_id);
    if (!client || !client.email) {
      alert("Impossible d'envoyer : Le client n'a pas d'email renseigné.");
      return;
    }
    
    setSendingEmail(d.id);
    
    try {
      // 1. Génération du PDF
      const doc = createPDFDoc(d);
      const pdfBlob = doc.output('blob');
      
      // 2. Upload vers Supabase (URL longue)
      const fileName = `devis_${d.numero_devis}.pdf`;
      const longUrl = await api.uploadDocument(fileName, pdfBlob);

      // 3. Raccourcissement de l'URL pour le mail
      const shortUrl = await api.shortenUrl(longUrl);

      // 4. Email propre
      const garageName = settings?.nom || 'Votre Garage';
      const subject = encodeURIComponent(`Devis ${d.numero_devis} - ${garageName}`);
      const vehiculeInfo = vehicule ? `${vehicule.marque} ${vehicule.modele}` : 'votre véhicule';
      
      // DESIGN EMAIL TEXTE AMÉLIORÉ
      const body = encodeURIComponent(
`Bonjour ${client.prenom} ${client.nom},

Veuillez trouver ci-joint votre devis concernant le véhicule :
🚗 ${vehiculeInfo}

------------------------------------------------------
📄  TÉLÉCHARGER LE DEVIS :
${shortUrl}
------------------------------------------------------

Détails du document :
🔹 Référence : ${d.numero_devis}
🔹 Montant   : ${d.montant_ttc.toFixed(2)} €

Nous restons à votre disposition pour valider les travaux.

Cordialement,

🔧 ${garageName}
📞 ${settings?.telephone || ''}`
      );
      
      const mailtoLink = `mailto:${client.email}?subject=${subject}&body=${body}`;

      window.location.href = mailtoLink;
      
      await onUpdate(d.id, { statut: 'en_attente' });
      // Pas besoin de setSentQuotes car le statut 'en_attente' va désactiver le bouton automatiquement via la prop
      alert("📨 Email ouvert !");

    } catch (err: any) {
      console.error("Erreur:", err);
      if (err.message.includes('bucket not found') || err.message.includes('new row violates row-level security policy')) {
         alert("ERREUR CONFIGURATION : Veuillez exécuter le script SQL fourni dans Supabase pour autoriser l'envoi.");
      } else {
         alert("Erreur lors de l'envoi : " + err.message);
      }
    } finally {
      setSendingEmail(null);
    }
  };

  const confirmDelete = async () => {
    if (!quoteToDelete) return;
    setDeleteLoading(true);
    try {
      await onDelete(quoteToDelete.id);
      setQuoteToDelete(null);
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Impossible de supprimer ce devis.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const getStatusColor = (s: Devis['statut']) => {
    switch(s) {
      case 'brouillon': return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
      case 'en_attente': return 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
      case 'accepte': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
      case 'refuse': return 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400';
      default: return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Modals existantes conservées (Conversion, Delete, Editor) */}
      {quoteToConvert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => !conversionLoading && setQuoteToConvert(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-300 flex flex-col items-center text-center border dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
             <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
             </div>
             <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Convertir en Facture ?</h3>
             <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
               Vous allez créer une nouvelle facture basée sur le devis <span className="font-bold text-slate-800 dark:text-white">{quoteToConvert.numero_devis}</span>.
             </p>
             <div className="flex flex-col gap-3 w-full">
               <button onClick={executeConversion} disabled={conversionLoading} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                 {conversionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Confirmer la conversion"}
               </button>
               <button onClick={() => setQuoteToConvert(null)} disabled={conversionLoading} className="w-full py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs">Annuler</button>
             </div>
          </div>
        </div>
      )}

      {quoteToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setQuoteToDelete(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-300 flex flex-col border dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
             <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </div>
             <h3 className="text-xl font-black text-slate-800 dark:text-white text-center mb-2">Supprimer ce devis ?</h3>
             <div className="flex flex-col gap-3 mt-6">
               <button onClick={confirmDelete} disabled={deleteLoading} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                 {deleteLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Supprimer définitivement"}
               </button>
               <button onClick={() => setQuoteToDelete(null)} disabled={deleteLoading} className="w-full py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs">Annuler</button>
             </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[2.5rem] w-full max-w-4xl shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[95vh] overflow-hidden border dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white">{editingDevis ? 'Modifier le Devis' : 'Nouveau Devis'}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Form Content... */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client *</label>
                  <select required className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-slate-700 dark:text-slate-200" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                    <option value="">Choisir un client</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">Véhicule *</label>
                  <select required className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-slate-700 dark:text-slate-200" value={formData.vehicule_id} onChange={e => setFormData({...formData,vehicule_id: e.target.value})}>
                    <option value="">Choisir un véhicule</option>
                    {vehicles.filter(v => v.client_id === formData.client_id).map(v => (
                      <option key={v.id} value={v.id}>{v.marque} {v.modele} - {v.immatriculation}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <DatePicker 
                    label="Date"
                    required
                    value={formData.date_devis}
                    onChange={(date) => setFormData({...formData, date_devis: date})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Statut</label>
                  <select required className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-slate-700 dark:text-slate-200" value={formData.statut} onChange={e => setFormData({...formData, statut: e.target.value as Devis['statut']})}>
                    <option value="brouillon">Brouillon</option>
                    <option value="en_attente">En Attente</option>
                    <option value="accepte">Accepté</option>
                    <option value="refuse">Refusé</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Détails de la prestation</label>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-700 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">
                      <tr>
                        <th className="px-4 py-3 w-1/2">Description</th>
                        <th className="px-4 py-3 w-20 text-center">Qté</th>
                        <th className="px-4 py-3 w-32 text-right">Prix Unit. HT</th>
                        <th className="px-4 py-3 w-32 text-right">Total HT</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {items.map((item, idx) => (
                        <tr key={idx} className="bg-white dark:bg-slate-900">
                          <td className="p-2"><input type="text" className="w-full p-2 bg-transparent outline-none font-bold text-sm text-slate-700 dark:text-slate-200" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} /></td>
                          <td className="p-2"><input type="number" min="1" className="w-full p-2 bg-transparent outline-none font-bold text-sm text-center text-slate-700 dark:text-slate-200" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} /></td>
                          <td className="p-2"><input type="number" step="0.01" className="w-full p-2 bg-transparent outline-none font-bold text-sm text-right text-slate-700 dark:text-slate-200" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value))} /></td>
                          <td className="p-2 text-right font-black text-sm text-slate-900 dark:text-white">{item.total.toFixed(2)} €</td>
                          <td className="p-2 text-center"><button type="button" onClick={() => removeItem(idx)} className="text-rose-300 hover:text-rose-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button type="button" onClick={addItem} className="w-full py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border-t border-slate-200 dark:border-slate-700">Ajouter une ligne</button>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes</label>
                  <textarea className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-medium text-sm h-32 text-slate-700 dark:text-slate-200" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
                <div className="w-full md:w-72 bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 space-y-3 h-fit">
                  <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 font-medium"><span>Total HT</span><span>{totals.ht.toFixed(2)} €</span></div>
                  <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 font-medium"><span>TVA (20%)</span><span>{totals.tva.toFixed(2)} €</span></div>
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-lg font-black text-slate-800 dark:text-white"><span>Total TTC</span><span>{totals.ttc.toFixed(2)} €</span></div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-[2.5rem] sticky bottom-0">
                <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs">
                  {loading ? "Enregistrement..." : editingDevis ? "Sauvegarder" : "Créer le devis"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header avec Barre d'Action et Filtres */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-[#1e293b] dark:text-white">Gestion des Devis</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Créez et suivez vos devis clients.</p>
          </div>
          <button onClick={() => { setEditingDevis(null); setIsModalOpen(true); }} className="w-full lg:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Nouveau Devis
          </button>
        </div>

        {/* Barre de Filtres */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
           <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input 
                type="text" 
                placeholder="Rechercher (Client, Référence...)" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all"
              />
           </div>
           <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              <button onClick={() => setStatusFilter('all')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${statusFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Tout</button>
              <button onClick={() => setStatusFilter('brouillon')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${statusFilter === 'brouillon' ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Brouillon</button>
              <button onClick={() => setStatusFilter('en_attente')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${statusFilter === 'en_attente' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>En Attente</button>
              <button onClick={() => setStatusFilter('accepte')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${statusFilter === 'accepte' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Accepté</button>
              <button onClick={() => setStatusFilter('refuse')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${statusFilter === 'refuse' ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Refusé</button>
           </div>
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
              {filteredDevis.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <p className="text-slate-400 dark:text-slate-500 font-bold italic">Aucun devis trouvé</p>
                  </td>
                </tr>
              ) : (
                filteredDevis.map((d) => {
                  const client = customers.find(c => c.id === d.client_id);
                  const isConverted = d.statut === 'accepte';
                  const isSending = sendingEmail === d.id;
                  
                  // Logique de verrouillage basée sur le statut du document
                  // Si 'en_attente' ou 'accepte', le document est considéré comme envoyé/validé
                  const isAlreadySent = d.statut === 'en_attente' || d.statut === 'accepte';

                  return (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group">
                      <td className="px-6 py-5 font-bold text-slate-700 dark:text-slate-200">{d.numero_devis}</td>
                      <td className="px-6 py-5 font-bold text-slate-800 dark:text-white">{client ? `${client.nom} ${client.prenom}` : 'Client Inconnu'}</td>
                      <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-400">{d.date_devis}</td>
                      <td className="px-6 py-5 font-black text-slate-900 dark:text-white">{d.montant_ttc.toFixed(2)} €</td>
                      <td className="px-6 py-5">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${getStatusColor(d.statut)}`}>{d.statut.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-5 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => handleSendEmail(d)} 
                          disabled={isSending || isAlreadySent}
                          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider border ${
                            isAlreadySent 
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 cursor-default' 
                              : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 dark:hover:bg-indigo-600 dark:hover:text-white'
                          }`}
                          title="Envoyer par Email"
                        >
                          {isSending ? (
                            <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
                          ) : isAlreadySent ? (
                            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> Envoyé</>
                          ) : (
                            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> Envoyer</>
                          )}
                        </button>
                        {isConverted ? (
                            <div className="p-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center cursor-help" title="Converti"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleConversionClick(d); }} className="p-2 rounded-lg transition-all border text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:bg-emerald-500 dark:hover:text-white" title="Convertir"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></button>
                        )}
                        <button onClick={() => handleDownloadPDF(d)} className="p-2 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:text-white dark:hover:bg-slate-700 transition-all" title="Télécharger"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                        <button onClick={() => { setEditingDevis(d); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg transition-all dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20" title="Modifier"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        <button onClick={() => setQuoteToDelete(d)} className="p-2 text-rose-600 hover:text-rose-800 bg-rose-50 rounded-lg transition-all dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20" title="Supprimer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </td>
                    </tr>
                  );
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
