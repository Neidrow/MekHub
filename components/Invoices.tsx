
import React, { useState, useEffect, useMemo } from 'react';
import { Facture, Client, Vehicule, GarageSettings, InvoiceItem } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../services/api';
import DatePicker from './DatePicker';

interface InvoicesProps {
  invoices: Facture[];
  customers: Client[];
  vehicles: Vehicule[];
  settings: GarageSettings | null;
  onAdd: (f: Omit<Facture, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Facture>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

const Invoices: React.FC<InvoicesProps> = ({ invoices, customers, vehicles, settings, onAdd, onUpdate, onDelete, onNotify }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Facture | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // --- FILTRES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const generateRef = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, '');
    return `F-${now.getFullYear()}-${dateStr.slice(4)}-${timeStr}`;
  };

  const [formData, setFormData] = useState({
    client_id: '',
    vehicule_id: '',
    numero_facture: generateRef(),
    date_facture: new Date().toISOString().split('T')[0],
    statut: 'brouillon' as Facture['statut'],
    acompte: 0,
    notes: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: 'Forfait Révision', quantity: 1, unitPrice: 80, total: 80 }
  ]);

  // Logique de filtrage
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const client = customers.find(c => c.id === inv.client_id);
      const clientName = client ? `${client.nom} ${client.prenom}` : '';
      
      const matchesSearch = 
        inv.numero_facture.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesStatus = statusFilter === 'all' || inv.statut === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, customers, searchTerm, statusFilter]);

  useEffect(() => {
    if (editingInvoice) {
      setFormData({
        client_id: editingInvoice.client_id,
        vehicule_id: editingInvoice.vehicule_id || '',
        numero_facture: editingInvoice.numero_facture,
        date_facture: editingInvoice.date_facture,
        statut: editingInvoice.statut,
        acompte: editingInvoice.acompte || 0,
        notes: editingInvoice.notes || ''
      });
      setItems(editingInvoice.items && editingInvoice.items.length > 0 ? editingInvoice.items : [{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    } else {
      setFormData({
        client_id: '',
        vehicule_id: '',
        numero_facture: generateRef(),
        date_facture: new Date().toISOString().split('T')[0],
        statut: 'brouillon',
        acompte: 0,
        notes: ''
      });
      setItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    }
  }, [editingInvoice]);

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
    const ttc = ht + tva;
    const acompte = formData.acompte || 0;
    return { ht, tva, ttc, acompte, rest: Math.max(0, ttc - acompte) };
  }, [items, formData.acompte]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicule_id) {
        onNotify("error", "Erreur de saisie", "Veuillez sélectionner un véhicule.");
        return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        vehicule_id: formData.vehicule_id,
        items,
        montant_ht: totals.ht,
        tva: totals.tva,
        montant_ttc: totals.ttc,
        montant_paye: totals.ttc - totals.rest 
      };
      if (editingInvoice) {
        // @ts-ignore
        await onUpdate(editingInvoice.id, payload);
        onNotify("success", "Facture mise à jour", "Les modifications ont été enregistrées.");
      } else {
        // @ts-ignore
        await onAdd(payload);
        onNotify("success", "Facture créée", "La nouvelle facture a été ajoutée.");
      }
      setIsModalOpen(false);
      setEditingInvoice(null);
    } catch (err: any) {
      console.error(err);
      onNotify("error", "Erreur système", err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- PDF Logic ---
  const createPDFDoc = (f: Facture) => {
    const doc = new jsPDF();
    const client = customers.find(c => c.id === f.client_id);
    const vehicule = vehicles.find(v => v.id === f.vehicule_id);
    const primaryColor: [number, number, number] = [16, 185, 129];

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
    // @ts-ignore
    doc.setTextColor(...primaryColor);
    doc.text("FACTURE", 150, 25, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`N° ${f.numero_facture}`, 150, 32, { align: 'right' });
    doc.text(`Date : ${new Date(f.date_facture).toLocaleDateString('fr-FR')}`, 150, 38, { align: 'right' });

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

    const tableBody = (f.items || []).map(item => [
      item.description, item.quantity, `${item.unitPrice.toFixed(2)} €`, `${item.total.toFixed(2)} €`
    ]);

    autoTable(doc, {
      startY: 100,
      head: [['Description', 'Qté', 'Prix Unit.', 'Total HT']],
      body: tableBody,
      // @ts-ignore
      headStyles: { fillColor: primaryColor, textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 30, halign: 'right' }, 3: { cellWidth: 30, halign: 'right' } }
    });

    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text(`Total HT :`, 140, finalY);
    doc.text(`${f.montant_ht.toFixed(2)} €`, 190, finalY, { align: 'right' });
    doc.text(`TVA (20%) :`, 140, finalY + 6);
    doc.text(`${f.tva.toFixed(2)} €`, 190, finalY + 6, { align: 'right' });
    
    let currentY = finalY + 14;
    doc.setFontSize(14);
    // @ts-ignore
    doc.setTextColor(...primaryColor);
    doc.text(`Total TTC :`, 140, currentY);
    doc.text(`${f.montant_ttc.toFixed(2)} €`, 190, currentY, { align: 'right' });

    if (f.acompte > 0) {
        currentY += 8;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Acompte perçu :`, 140, currentY);
        doc.text(`- ${f.acompte.toFixed(2)} €`, 190, currentY, { align: 'right' });
        currentY += 8;
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(`Net à Payer :`, 140, currentY);
        const net = f.montant_ttc - f.acompte;
        doc.text(`${net.toFixed(2)} €`, 190, currentY, { align: 'right' });
    }

    if (f.notes) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.setFont("helvetica", "bold");
      doc.text("Notes :", 15, currentY - 5);
      doc.setFont("helvetica", "italic");
      doc.text(f.notes, 15, currentY, { maxWidth: 100 });
    }

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Document généré par GaragePro SaaS", 105, 290, { align: 'center' });

    return doc;
  };

  const handleDownloadPDF = (f: Facture) => {
    if (!settings) { onNotify("error", "Configuration manquante", "Configurez les paramètres avant de télécharger."); return; }
    const doc = createPDFDoc(f);
    doc.save(`Facture_${f.numero_facture}.pdf`);
  };

  const handleSendEmail = async (f: Facture) => {
    const client = customers.find(c => c.id === f.client_id);
    if (!client || !client.email) {
      onNotify("error", "Email manquant", "Le client n'a pas d'adresse email renseignée.");
      return;
    }
    
    setSendingEmail(f.id);
    
    try {
      // 1. Génération du PDF
      const doc = createPDFDoc(f);
      const pdfBlob = doc.output('blob');
      
      // 2. Upload avec option téléchargement forcé (URL Longue)
      const fileName = `facture_${f.numero_facture}.pdf`;
      const longUrl = await api.uploadDocument(fileName, pdfBlob);

      // 3. Raccourcissement de l'URL
      const shortUrl = await api.shortenUrl(longUrl);

      // 4. Email propre
      const garageName = settings?.nom || 'Votre Garage';
      const subject = encodeURIComponent(`Facture ${f.numero_facture} - ${garageName}`);
      
      // DESIGN EMAIL TEXTE AMÉLIORÉ
      const body = encodeURIComponent(
`Bonjour ${client.prenom} ${client.nom},

Merci de votre confiance pour l'entretien de votre véhicule.
Votre facture est désormais disponible au téléchargement.

------------------------------------------------------
📄  TÉLÉCHARGER LA FACTURE :
${shortUrl}
------------------------------------------------------

Récapitulatif :
🔹 Numéro  : ${f.numero_facture}
🔹 Montant : ${f.montant_ttc.toFixed(2)} €

Nous vous souhaitons une bonne route !

Cordialement,

🔧 ${garageName}
📞 ${settings?.telephone || ''}`
      );
      
      const mailtoLink = `mailto:${client.email}?subject=${subject}&body=${body}`;

      window.location.href = mailtoLink;
      
      await onUpdate(f.id, { statut: 'non_payee' });
      
      onNotify("success", "Messagerie ouverte", "Le brouillon de l'email a été généré. Veuillez cliquer sur 'Envoyer' dans votre logiciel de messagerie.");

    } catch (err: any) {
      console.error("Erreur:", err);
      if (err.message.includes('bucket not found')) {
         onNotify("error", "Erreur Configuration", "Veuillez exécuter le script SQL fourni dans Supabase pour autoriser l'envoi.");
      } else {
         onNotify("error", "Erreur d'envoi", err.message);
      }
    } finally {
      setSendingEmail(null);
    }
  };

  const confirmDelete = async () => {
    if (!invoiceToDelete) return;
    setDeleteLoading(true);
    try {
      await onDelete(invoiceToDelete.id);
      setInvoiceToDelete(null);
      onNotify("success", "Suppression réussie", "La facture a été supprimée.");
    } catch (error) {
      console.error("Erreur suppression:", error);
      onNotify("error", "Erreur", "Impossible de supprimer cette facture.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Modal Suppression */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setInvoiceToDelete(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-300 flex flex-col border dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
             <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </div>
             <h3 className="text-xl font-black text-slate-800 dark:text-white text-center mb-2">Supprimer cette facture ?</h3>
             <div className="flex flex-col gap-3 mt-6">
               <button onClick={confirmDelete} disabled={deleteLoading} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                 {deleteLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Supprimer définitivement"}
               </button>
               <button onClick={() => setInvoiceToDelete(null)} disabled={deleteLoading} className="w-full py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs">Annuler</button>
             </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[2.5rem] w-full max-w-4xl shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[95vh] overflow-hidden border dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white">{editingInvoice ? 'Modifier la Facture' : 'Nouvelle Facture'}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client *</label><select required className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-slate-700 dark:text-slate-200" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}><option value="">Choisir un client</option>{customers.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">Véhicule *</label><select required className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-slate-700 dark:text-slate-200" value={formData.vehicule_id} onChange={e => setFormData({...formData, vehicule_id: e.target.value})}><option value="">Choisir un véhicule</option>{vehicles.filter(v => v.client_id === formData.client_id).map(v => (<option key={v.id} value={v.id}>{v.marque} {v.modele} - {v.immatriculation}</option>))}</select></div>
                <div className="space-y-1">
                  <DatePicker 
                    label="Date"
                    required
                    value={formData.date_facture}
                    onChange={(date) => setFormData({...formData, date_facture: date})}
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Statut</label>
                  <select 
                    required 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-slate-700 dark:text-slate-200" 
                    value={formData.statut} 
                    onChange={e => setFormData({...formData, statut: e.target.value as Facture['statut']})}
                  >
                    <option value="brouillon">Brouillon</option>
                    <option value="non_payee">Envoyée / En attente</option>
                    <option value="payee">Payée</option>
                    <option value="annule">Annulée</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prestations</label>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-700 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase"><tr><th className="px-4 py-3 w-1/2">Description</th><th className="px-4 py-3 w-20 text-center">Qté</th><th className="px-4 py-3 w-32 text-right">Prix Unit. HT</th><th className="px-4 py-3 w-32 text-right">Total HT</th><th className="px-4 py-3 w-10"></th></tr></thead>
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
                  <button type="button" onClick={addItem} className="w-full py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border-t border-slate-200 dark:border-slate-700">Ajouter une ligne</button>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-4">
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes</label><textarea className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-medium text-sm h-20 text-slate-700 dark:text-slate-200" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acompte</label><input type="number" step="0.01" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm text-slate-700 dark:text-slate-200" value={formData.acompte || ''} onChange={e => setFormData({...formData, acompte: parseFloat(e.target.value) || 0})} placeholder="0.00" /></div>
                </div>
                <div className="w-full md:w-72 bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20 space-y-3 h-fit">
                  <div className="flex justify-between text-sm text-emerald-800/60 dark:text-emerald-400/60 font-medium"><span>Total HT</span><span>{totals.ht.toFixed(2)} €</span></div>
                  <div className="flex justify-between text-sm text-emerald-800/60 dark:text-emerald-400/60 font-medium"><span>TVA (20%)</span><span>{totals.tva.toFixed(2)} €</span></div>
                  <div className="flex justify-between text-sm text-emerald-800/60 dark:text-emerald-400/60 font-medium"><span>Total TTC</span><span>{totals.ttc.toFixed(2)} €</span></div>
                  {totals.acompte > 0 && <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-bold border-t border-emerald-200 dark:border-emerald-500/20 pt-2"><span>Acompte</span><span>- {totals.acompte.toFixed(2)} €</span></div>}
                  <div className="pt-3 border-t-2 border-emerald-200 dark:border-emerald-500/20 flex justify-between text-xl font-black text-emerald-900 dark:text-emerald-300"><span>À Payer</span><span>{totals.rest.toFixed(2)} €</span></div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-[2.5rem] sticky bottom-0">
                <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs">
                  {loading ? "Enregistrement..." : editingInvoice ? "Sauvegarder" : "Créer la facture"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header & Filtres */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-[#1e293b] dark:text-white">Facturation</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Suivi des paiements et historique.</p>
          </div>
          <button onClick={() => { setEditingInvoice(null); setIsModalOpen(true); }} className="w-full lg:w-auto px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Nouvelle Facture
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
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-all"
              />
           </div>
           <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              <button onClick={() => setStatusFilter('all')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${statusFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Tout</button>
              <button onClick={() => setStatusFilter('payee')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${statusFilter === 'payee' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Payée</button>
              <button onClick={() => setStatusFilter('non_payee')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${statusFilter === 'non_payee' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>En Attente</button>
              <button onClick={() => setStatusFilter('brouillon')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${statusFilter === 'brouillon' ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Brouillon</button>
              <button onClick={() => setStatusFilter('annule')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${statusFilter === 'annule' ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Annulée</button>
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
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <p className="text-slate-400 dark:text-slate-500 font-bold italic">Aucune facture trouvée</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const client = customers.find(c => c.id === inv.client_id);
                  const isSending = sendingEmail === inv.id;
                  const isAlreadySent = inv.statut === 'non_payee' || inv.statut === 'payee';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-5 font-bold text-slate-700 dark:text-slate-200">{inv.numero_facture}</td>
                      <td className="px-6 py-5 font-bold text-slate-800 dark:text-white">{client ? `${client.nom} ${client.prenom}` : 'Client Inconnu'}</td>
                      <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-400">{inv.date_facture}</td>
                      <td className="px-6 py-5 font-black text-slate-900 dark:text-white">{inv.montant_ttc.toFixed(2)} €</td>
                      <td className="px-6 py-5">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${
                          inv.statut === 'payee' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 
                          inv.statut === 'non_payee' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 
                          inv.statut === 'brouillon' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                        }`}>{inv.statut.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-5 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => handleSendEmail(inv)} 
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
                        <button onClick={() => handleDownloadPDF(inv)} className="p-2 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:text-white dark:hover:bg-slate-700 transition-all" title="Télécharger"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                        <button onClick={() => { setEditingInvoice(inv); setIsModalOpen(true); }} className="p-2 text-emerald-600 hover:text-emerald-800 bg-emerald-50 rounded-lg transition-all dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20" title="Modifier"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        <button onClick={() => setInvoiceToDelete(inv)} className="p-2 text-rose-600 hover:text-rose-800 bg-rose-50 rounded-lg transition-all dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20" title="Supprimer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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

export default Invoices;
