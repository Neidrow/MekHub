
import React, { useState, useEffect, useMemo } from 'react';
import { Devis, Client, Vehicule, GarageSettings, InvoiceItem } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface QuotesProps {
  devis: Devis[];
  customers: Client[];
  vehicles: Vehicule[];
  settings: GarageSettings | null;
  onAdd: (d: Omit<Devis, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Devis>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const Quotes: React.FC<QuotesProps> = ({ devis, customers, vehicles, settings, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevis, setEditingDevis] = useState<Devis | null>(null);
  const [loading, setLoading] = useState(false);

  // States pour la suppression
  const [quoteToDelete, setQuoteToDelete] = useState<Devis | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Générateur de référence logique : D-AAAA-MMJJ-HHMM (ex: D-2025-0524-1030)
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
    statut: 'en_attente' as Devis['statut'],
    notes: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: 'Main d\'oeuvre', quantity: 1, unitPrice: 50, total: 50 }
  ]);

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
        statut: 'en_attente',
        notes: ''
      });
      setItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    }
  }, [editingDevis]);

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    // Recalcul du total de la ligne
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
    return { ht, tva, ttc: ht + tva };
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        vehicule_id: formData.vehicule_id === '' ? null : formData.vehicule_id,
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
      console.error("Erreur Devis:", err);
      let msg = err.message || "Erreur inconnue";
      if (err.code === "23514") msg = "Erreur de contrainte : Le statut choisi n'est pas autorisé par la base de données.";
      if (err.code === "22P02") msg = "Erreur de format : Un champ (ex: Véhicule) est invalide.";
      alert(`Erreur (${err.code || '?'}) : ${msg}`);
    } finally {
      setLoading(false);
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

  const generatePDF = (d: Devis) => {
    if (!settings) {
      alert("Veuillez configurer les paramètres de l'atelier avant de générer un PDF.");
      return;
    }

    const doc = new jsPDF();
    const client = customers.find(c => c.id === d.client_id);
    const vehicule = vehicles.find(v => v.id === d.vehicule_id);

    // Header - Logo
    if (settings.logo_url) {
      try {
        doc.addImage(settings.logo_url, 'JPEG', 15, 15, 30, 30);
      } catch (e) {
        console.warn("Erreur chargement logo PDF", e);
      }
    }

    // Garage Info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(settings.nom || "Garage", 15, 55);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(settings.adresse || "", 15, 62);
    doc.text(`${settings.email} | ${settings.telephone}`, 15, 68);
    doc.text(`SIRET: ${settings.siret}`, 15, 74);

    // Titre
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Blue
    doc.text("DEVIS", 150, 25, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`N° ${d.numero_devis}`, 150, 32, { align: 'right' });
    doc.text(`Date : ${new Date(d.date_devis).toLocaleDateString('fr-FR')}`, 150, 38, { align: 'right' });

    // Client Info (Style Classique Encadré)
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
    } else {
      doc.text("Client inconnu", 125, 65);
    }

    // Véhicule Info (si présent)
    if (vehicule) {
      doc.setFontSize(9);
      doc.setTextColor(50);
      doc.text(`Véhicule : ${vehicule.marque} ${vehicule.modele} - ${vehicule.immatriculation} (${vehicule.kilometrage} km)`, 15, 90);
    }

    // Tableau Items
    const tableBody = (d.items || []).map(item => [
      item.description,
      item.quantity,
      `${item.unitPrice.toFixed(2)} €`,
      `${item.total.toFixed(2)} €`
    ]);

    autoTable(doc, {
      startY: 100,
      head: [['Description', 'Qté', 'Prix Unit.', 'Total HT']],
      body: tableBody,
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      }
    });

    // Totals
    // @ts-ignore (finalY exists on previousAutoTable)
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

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Document généré par GaragePro SaaS", 105, 290, { align: 'center' });

    doc.save(`Devis_${d.numero_devis}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* --- Modal Suppression Sécurisé --- */}
      {quoteToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setQuoteToDelete(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-300 flex flex-col" onClick={(e) => e.stopPropagation()}>
             <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </div>
             <h3 className="text-xl font-black text-slate-800 text-center mb-2">Supprimer ce devis ?</h3>
             <p className="text-slate-500 text-center text-sm mb-8 leading-relaxed">
               Attention, cette action est <span className="font-bold text-rose-600">irréversible</span>. Le devis <span className="font-bold text-slate-700">{quoteToDelete.numero_devis}</span> sera définitivement effacé.
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
                 onClick={() => setQuoteToDelete(null)}
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
            {/* Header Modal */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2.5rem]">
              <div>
                <h2 className="text-xl font-black text-slate-800">{editingDevis ? 'Modifier le Devis' : 'Nouveau Devis'}</h2>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Édition des lignes</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Infos Générales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <option value="">(Optionnel) Véhicule concerné</option>
                    {vehicles.filter(v => v.client_id === formData.client_id).map(v => (
                      <option key={v.id} value={v.id}>{v.marque} {v.modele} - {v.immatriculation}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                  <input type="date" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" value={formData.date_devis} onChange={e => setFormData({...formData, date_devis: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Statut</label>
                  <select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" value={formData.statut} onChange={e => setFormData({...formData, statut: e.target.value as Devis['statut']})}>
                    <option value="en_attente">En Attente</option>
                    <option value="accepte">Accepté</option>
                    <option value="refuse">Refusé</option>
                  </select>
                </div>
              </div>

              {/* Lignes Articles */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Détails de la prestation</label>
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
                              // Astuce pour éviter le '0' bloquant : on affiche chaîne vide si 0, sinon la valeur
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
                  <button type="button" onClick={addItem} className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-blue-600 font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border-t border-slate-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                    Ajouter une ligne
                  </button>
                </div>
              </div>

              {/* Totaux & Notes */}
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes / Conditions</label>
                  <textarea 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm h-32"
                    placeholder="Conditions de paiement, validité du devis..."
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
                <div className="w-full md:w-72 bg-slate-50 p-6 rounded-[2rem] border border-slate-200 space-y-3 h-fit">
                  <div className="flex justify-between text-sm text-slate-500 font-medium">
                    <span>Total HT</span>
                    <span>{totals.ht.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500 font-medium">
                    <span>TVA (20%)</span>
                    <span>{totals.tva.toFixed(2)} €</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between text-lg font-black text-slate-800">
                    <span>Total TTC</span>
                    <span>{totals.ttc.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 bg-white rounded-b-[2.5rem]">
              <button disabled={loading} onClick={handleSubmit} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs">
                {loading ? "Enregistrement..." : editingDevis ? "Sauvegarder les modifications" : "Créer le devis"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Liste des Devis --- */}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black text-[#1e293b]">Gestion des Devis</h3>
        <button onClick={() => { setEditingDevis(null); setIsModalOpen(true); }} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Créer un Devis
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        {devis.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h4 className="text-xl font-bold text-slate-800">Aucun devis disponible</h4>
            <p className="text-slate-500 mt-2 max-w-sm">Commencez par créer votre premier devis pour un client potentiel.</p>
          </div>
        ) : (
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
                {devis.map((d) => {
                  const client = customers.find(c => c.id === d.client_id);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50 transition-all group">
                      <td className="px-6 py-5 font-bold text-slate-700">{d.numero_devis}</td>
                      <td className="px-6 py-5 font-bold text-slate-800">{client ? `${client.nom} ${client.prenom}` : 'Client Inconnu'}</td>
                      <td className="px-6 py-5 text-sm text-slate-500">{d.date_devis}</td>
                      <td className="px-6 py-5 font-black text-slate-900">{d.montant_ttc.toFixed(2)} €</td>
                      <td className="px-6 py-5">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${
                          d.statut === 'accepte' ? 'bg-emerald-50 text-emerald-600' :
                          d.statut === 'refuse' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {d.statut}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right space-x-2">
                        <button onClick={() => generatePDF(d)} className="p-2 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-all" title="Télécharger PDF">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                        <button onClick={() => { setEditingDevis(d); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg transition-all" title="Modifier">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => setQuoteToDelete(d)} className="p-2 text-rose-600 hover:text-rose-800 bg-rose-50 rounded-lg transition-all" title="Supprimer">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quotes;
