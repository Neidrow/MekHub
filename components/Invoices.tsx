
import React, { useState, useEffect, useMemo } from 'react';
import { Facture, Client, Vehicule, GarageSettings, InvoiceItem } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoicesProps {
  invoices: Facture[];
  customers: Client[];
  vehicles: Vehicule[];
  settings: GarageSettings | null;
  onAdd: (f: Omit<Facture, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Facture>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const Invoices: React.FC<InvoicesProps> = ({ invoices, customers, vehicles, settings, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(false);
  
  // States pour la suppression
  const [invoiceToDelete, setInvoiceToDelete] = useState<Facture | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Générateur de référence logique : F-AAAA-MMJJ-HHMM
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
    statut: 'non_payee' as Facture['statut'],
    acompte: 0,
    notes: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: 'Forfait Révision', quantity: 1, unitPrice: 80, total: 80 }
  ]);

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
        statut: 'non_payee',
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
    const tva = ht * 0.20; // 20%
    const ttc = ht + tva;
    const acompte = formData.acompte || 0;
    return { ht, tva, ttc, acompte, rest: Math.max(0, ttc - acompte) };
  }, [items, formData.acompte]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        vehicule_id: formData.vehicule_id === '' ? null : formData.vehicule_id,
        items,
        montant_ht: totals.ht,
        tva: totals.tva,
        montant_ttc: totals.ttc,
        montant_paye: totals.ttc - totals.rest 
      };

      if (editingInvoice) {
        // @ts-ignore
        await onUpdate(editingInvoice.id, payload);
      } else {
        // @ts-ignore
        await onAdd(payload);
      }
      setIsModalOpen(false);
      setEditingInvoice(null);
    } catch (err: any) {
      console.error("Erreur Facture:", err);
      let msg = err.message || "Erreur inconnue";
      if (err.code === "23514") msg = "Erreur de contrainte : Le statut choisi n'est pas autorisé par la base de données.";
      if (err.code === "22P02") msg = "Erreur de format : Un champ (ex: Véhicule) est invalide.";
      alert(`Erreur (${err.code || '?'}) : ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!invoiceToDelete) return;
    setDeleteLoading(true);
    try {
      await onDelete(invoiceToDelete.id);
      setInvoiceToDelete(null);
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Impossible de supprimer cette facture.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const generatePDF = (f: Facture) => {
    if (!settings) {
      alert("Veuillez configurer les paramètres de l'atelier avant de générer un PDF.");
      return;
    }

    const doc = new jsPDF();
    const client = customers.find(c => c.id === f.client_id);
    const vehicule = vehicles.find(v => v.id === f.vehicule_id);
    
    // --- EN-TÊTE GAUCHE (GARAGE) ---
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(settings.nom || "Garage", 15, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    let yPos = 26;
    doc.text(settings.adresse || "", 15, yPos); yPos += 5;
    doc.text(`${settings.email} | ${settings.telephone}`, 15, yPos); yPos += 5;
    doc.text(`SIRET: ${settings.siret}`, 15, yPos);

    // --- EN-TÊTE DROIT (TITRE & REF) ---
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text("FACTURE", 195, 25, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "bold");
    doc.text(`Réf: ${f.numero_facture}`, 195, 33, { align: 'right' });
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${new Date(f.date_facture).toLocaleDateString('fr-FR')}`, 195, 38, { align: 'right' });

    // --- LIGNE DE SÉPARATION ---
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 45, 195, 45);

    // --- BLOC CLIENT (ENCADRÉ) ---
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(110, 55, 85, 35, 3, 3, 'FD');
    
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("Facturé à :", 115, 62);
    
    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.setFont("helvetica", "bold");
    if (client) {
      doc.text(`${client.nom} ${client.prenom}`, 115, 68);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(client.adresse || "", 115, 74);
      doc.text(client.telephone || "", 115, 80);
    } else {
      doc.text("Client inconnu", 115, 68);
    }

    // --- BLOC VÉHICULE (GAUCHE) ---
    if (vehicule) {
      doc.setFontSize(10);
      doc.setTextColor(30);
      doc.setFont("helvetica", "bold");
      doc.text("Véhicule concerné :", 15, 62);
      doc.setFont("helvetica", "normal");
      doc.text(`${vehicule.marque} ${vehicule.modele}`, 15, 68);
      doc.text(`Immat: ${vehicule.immatriculation}`, 15, 74);
      if(vehicule.kilometrage) doc.text(`Km: ${vehicule.kilometrage.toLocaleString()} km`, 15, 80);
    }

    // --- TABLEAU ---
    const tableBody = (f.items || []).map(item => [
      item.description,
      item.quantity,
      `${item.unitPrice.toFixed(2)} €`,
      `${item.total.toFixed(2)} €`
    ]);

    autoTable(doc, {
      startY: 100,
      head: [['Désignation', 'Qté', 'Prix Unit. HT', 'Total HT']],
      body: tableBody,
      theme: 'grid',
      headStyles: { 
        fillColor: [16, 185, 129], 
        textColor: 255, 
        fontStyle: 'bold', 
        halign: 'left' 
      },
      styles: { 
        fontSize: 10, 
        cellPadding: 4,
        textColor: 50
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    // --- TOTAUX ---
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 10;
    const rightMargin = 195;
    
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text("Total HT :", 140, finalY);
    doc.text(`${f.montant_ht.toFixed(2)} €`, rightMargin, finalY, { align: 'right' });
    
    doc.text("TVA (20%) :", 140, finalY + 6);
    doc.text(`${f.tva.toFixed(2)} €`, rightMargin, finalY + 6, { align: 'right' });
    
    let ttcY = finalY + 16.5;

    if (f.acompte > 0) {
       doc.text("Acompte perçu :", 140, finalY + 12);
       doc.text(`- ${f.acompte.toFixed(2)} €`, rightMargin, finalY + 12, { align: 'right' });
       ttcY += 6;
    }

    // Cadre Net à Payer
    doc.setFillColor(16, 185, 129);
    doc.rect(135, ttcY - 6.5, 60, 10, 'F');
    doc.setTextColor(255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Net à Payer :", 140, ttcY);
    const net = f.montant_ttc - (f.acompte || 0);
    doc.text(`${net.toFixed(2)} €`, rightMargin, ttcY, { align: 'right' });

    // --- NOTES ---
    if (f.notes) {
      const noteY = ttcY + 15;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.setFont("helvetica", "bold");
      doc.text("Notes :", 15, noteY);
      doc.setFont("helvetica", "italic");
      doc.text(f.notes, 15, noteY + 5, { maxWidth: 100 });
    }

    // --- PIED DE PAGE ---
    const pageHeight = doc.internal.pageSize.height;
    doc.setDrawColor(200);
    doc.line(15, pageHeight - 15, 195, pageHeight - 15);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont("helvetica", "normal");
    doc.text("Document généré par GaragePro SaaS. Merci de votre confiance.", 105, pageHeight - 10, { align: 'center' });

    doc.save(`Facture_${f.numero_facture}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* --- Modal Suppression Sécurisé --- */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setInvoiceToDelete(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-300 flex flex-col" onClick={(e) => e.stopPropagation()}>
             <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </div>
             <h3 className="text-xl font-black text-slate-800 text-center mb-2">Supprimer cette facture ?</h3>
             <p className="text-slate-500 text-center text-sm mb-8 leading-relaxed">
               Attention, cette action est <span className="font-bold text-rose-600">irréversible</span>. La facture <span className="font-bold text-slate-700">{invoiceToDelete.numero_facture}</span> sera définitivement effacée.
             </p>
             <div className="flex flex-col gap-3">
               <button 
                 onClick={confirmDelete}
                 disabled={deleteLoading}
                 className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
               >
                 {deleteLoading ? (
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 ) : (
                   "Supprimer définitivement"
                 )}
               </button>
               <button 
                 onClick={() => setInvoiceToDelete(null)}
                 disabled={deleteLoading}
                 className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
               >
                 Annuler
               </button>
             </div>
          </div>
        </div>
      )}

      {/* --- Modal Editeur --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2.5rem]">
              <div>
                <h2 className="text-xl font-black text-slate-800">{editingInvoice ? 'Modifier la Facture' : 'Nouvelle Facture'}</h2>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Facturation</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Infos Générales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client</label>
                  <select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                    <option value="">Choisir un client</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Véhicule</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" value={formData.vehicule_id} onChange={e => setFormData({...formData, vehicule_id: e.target.value})}>
                    <option value="">(Optionnel) Véhicule</option>
                    {vehicles.filter(v => v.client_id === formData.client_id).map(v => (
                      <option key={v.id} value={v.id}>{v.marque} {v.modele} - {v.immatriculation}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                  <input type="date" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" value={formData.date_facture} onChange={e => setFormData({...formData, date_facture: e.target.value})} />
                </div>
              </div>

              {/* Lignes Articles */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prestations & Pièces</label>
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3 w-1/2">Description</th>
                        <th className="px-4 py-3 w-20 text-center">Qté</th>
                        <th className="px-4 py-3 w-32 text-right">Prix Unit. HT</th>
                        <th className="px-4 py-3 w-32 text-right">Total HT</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {items.map((item, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-2">
                            <input 
                              type="text" 
                              placeholder="Description" 
                              className="w-full p-2 bg-transparent outline-none font-bold text-sm text-slate-800 placeholder-slate-400"
                              value={item.description}
                              onChange={e => updateItem(idx, 'description', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              min="1"
                              className="w-full p-2 bg-transparent outline-none font-bold text-sm text-center text-slate-800"
                              value={item.quantity}
                              onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00"
                              className="w-full p-2 bg-transparent outline-none font-bold text-sm text-right text-slate-800 placeholder-slate-300"
                              // Même astuce pour l'input
                              value={item.unitPrice === 0 ? '' : item.unitPrice}
                              onChange={e => {
                                const val = e.target.value;
                                updateItem(idx, 'unitPrice', val === '' ? 0 : parseFloat(val));
                              }}
                            />
                          </td>
                          <td className="p-2 text-right font-black text-sm text-slate-900">
                            {item.total.toFixed(2)} €
                          </td>
                          <td className="p-2 text-center">
                            <button type="button" onClick={() => removeItem(idx)} className="p-1 text-rose-300 hover:text-rose-500 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button type="button" onClick={addItem} className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-emerald-600 font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border-t border-slate-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                    Ajouter une ligne
                  </button>
                </div>
              </div>

              {/* Totaux & Notes */}
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes Publiques</label>
                     <textarea 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm h-20"
                        placeholder="Message pour le client..."
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acompte reçu (Optionnel)</label>
                     <input 
                        type="number" 
                        step="0.01" 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" 
                        value={formData.acompte === 0 ? '' : formData.acompte} 
                        onChange={e => {
                           const val = e.target.value;
                           setFormData({...formData, acompte: val === '' ? 0 : parseFloat(val)});
                        }}
                        placeholder="0.00"
                     />
                  </div>
                </div>
                
                <div className="w-full md:w-72 bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 space-y-3 h-fit shadow-sm">
                  <div className="flex justify-between text-sm text-emerald-800/60 font-medium">
                    <span>Total HT</span>
                    <span>{totals.ht.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-800/60 font-medium">
                    <span>TVA (20%)</span>
                    <span>{totals.tva.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-800/60 font-medium">
                    <span>Total TTC</span>
                    <span>{totals.ttc.toFixed(2)} €</span>
                  </div>
                  {totals.acompte > 0 && (
                     <div className="flex justify-between text-sm text-emerald-600 font-bold border-t border-emerald-200 pt-2">
                        <span>Acompte</span>
                        <span>- {totals.acompte.toFixed(2)} €</span>
                     </div>
                  )}
                  <div className="pt-3 border-t-2 border-emerald-200 flex justify-between text-xl font-black text-emerald-900">
                    <span>À Payer</span>
                    <span>{totals.rest.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 bg-white rounded-b-[2.5rem]">
              <button disabled={loading} onClick={handleSubmit} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs">
                {loading ? "Enregistrement..." : editingInvoice ? "Sauvegarder les modifications" : "Créer la facture"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Liste des Factures --- */}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black text-[#1e293b]">Facturation</h3>
        <button onClick={() => { setEditingInvoice(null); setIsModalOpen(true); }} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Nouvelle Facture
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Référence</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Client</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Montant TTC</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Statut</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Aucune facture enregistrée.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const client = customers.find(c => c.id === inv.client_id);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-5 font-bold text-slate-700">{inv.numero_facture}</td>
                      <td className="px-6 py-5 font-bold text-slate-800">{client ? `${client.nom} ${client.prenom}` : 'Client Inconnu'}</td>
                      <td className="px-6 py-5 text-sm text-slate-500">{inv.date_facture}</td>
                      <td className="px-6 py-5 font-black text-slate-900">{inv.montant_ttc.toFixed(2)} €</td>
                      <td className="px-6 py-5">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${
                          inv.statut === 'payee' ? 'bg-emerald-50 text-emerald-600' : 
                          inv.statut === 'non_payee' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {inv.statut.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right space-x-2">
                        <button onClick={() => generatePDF(inv)} className="p-2 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-all" title="Télécharger PDF">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                        <button onClick={() => { setEditingInvoice(inv); setIsModalOpen(true); }} className="p-2 text-emerald-600 hover:text-emerald-800 bg-emerald-50 rounded-lg transition-all" title="Modifier">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => setInvoiceToDelete(inv)} className="p-2 text-rose-600 hover:text-rose-800 bg-rose-50 rounded-lg transition-all" title="Supprimer">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
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
