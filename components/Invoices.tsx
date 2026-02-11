
import React, { useState, useEffect, useMemo } from 'react';
import { Facture, Client, Vehicule, GarageSettings, InvoiceItem } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../services/api';
import DatePicker from './DatePicker';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { t, locale, language } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Facture | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [statusUpdateInvoice, setStatusUpdateInvoice] = useState<Facture | null>(null);

  const currentVat = settings?.tva !== undefined ? settings.tva : 20;

  const generateRef = () => { const now = new Date(); const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, ''); return `F-${now.getFullYear()}-${dateStr.slice(4)}-${timeStr}`; };
  const [formData, setFormData] = useState({ client_id: '', vehicule_id: '', numero_facture: generateRef(), date_facture: new Date().toISOString().split('T')[0], statut: 'brouillon' as Facture['statut'], acompte: 0, notes: '' });
  const [items, setItems] = useState<InvoiceItem[]>([{ description: t('invoices.default_item'), quantity: 1, unitPrice: 80, total: 80 }]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const client = customers.find(c => c.id === inv.client_id);
      const clientName = client ? `${client.nom} ${client.prenom}` : '';
      const matchesSearch = inv.numero_facture.toLowerCase().includes(searchTerm.toLowerCase()) || clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.statut === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, customers, searchTerm, statusFilter]);

  useEffect(() => {
    if (editingInvoice) {
      setFormData({ client_id: editingInvoice.client_id, vehicule_id: editingInvoice.vehicule_id || '', numero_facture: editingInvoice.numero_facture, date_facture: editingInvoice.date_facture, statut: editingInvoice.statut, acompte: editingInvoice.acompte || 0, notes: editingInvoice.notes || '' });
      setItems(editingInvoice.items && editingInvoice.items.length > 0 ? editingInvoice.items : [{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    } else {
      setFormData({ client_id: '', vehicule_id: '', numero_facture: generateRef(), date_facture: new Date().toISOString().split('T')[0], statut: 'brouillon', acompte: 0, notes: '' });
      setItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    }
  }, [editingInvoice, isModalOpen]);

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => { const newItems = [...items]; const item = { ...newItems[index], [field]: value }; item.total = (item.quantity || 0) * (item.unitPrice || 0); newItems[index] = item; setItems(newItems); };
  const addItem = () => { setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]); };
  const removeItem = (index: number) => { setItems(items.filter((_, i) => i !== index)); };

  const totals = useMemo(() => {
    const ht = items.reduce((acc, item) => acc + (item.total || 0), 0);
    let vatRate = (settings?.tva !== undefined ? settings.tva : 20) / 100;
    const tva = ht * vatRate;
    const ttc = ht + tva;
    const acompte = formData.acompte || 0;
    return { ht, tva, ttc, acompte, rest: Math.max(0, ttc - acompte) };
  }, [items, formData.acompte, settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicule_id) { onNotify("error", t('common.error'), t('vehicles.search_placeholder')); return; }
    setLoading(true);
    try {
      const payload = { ...formData, vehicule_id: formData.vehicule_id, items, montant_ht: totals.ht, tva: totals.tva, montant_ttc: totals.ttc, montant_paye: totals.ttc - totals.rest };
      if (editingInvoice) { await onUpdate(editingInvoice.id, payload); onNotify("success", t('settings.save_success'), t('settings.save_success')); }
      else { await onAdd(payload); onNotify("success", t('common.save'), t('settings.save_success')); }
      setIsModalOpen(false);
      setEditingInvoice(null);
    } catch (err: any) { onNotify("error", t('common.error'), err.message); }
    finally { setLoading(false); }
  };

  const handleChangeStatus = async (newStatus: Facture['statut']) => {
    if (!statusUpdateInvoice) return;
    try {
        await onUpdate(statusUpdateInvoice.id, { statut: newStatus });
        onNotify('success', t('settings.save_success'), `Facture -> ${getStatusLabel(newStatus)}.`);
        setStatusUpdateInvoice(null);
    } catch (e: any) {
        onNotify('error', t('common.error'), e.message);
    }
  };

  const createPDFDoc = (f: Facture) => {
    const doc = new jsPDF();
    const client = customers.find(c => c.id === f.client_id);
    const primaryColor: [number, number, number] = [16, 185, 129];
    if (settings?.logo_url) { try { doc.addImage(settings.logo_url, 'JPEG', 15, 15, 30, 30); } catch (e) {} }
    doc.setFontSize(14).setFont("helvetica", "bold").text(settings?.nom || "Garage", 15, 55);
    doc.setFontSize(10).setFont("helvetica", "normal").text(settings?.adresse || "", 15, 62);
    doc.text(`SIRET: ${settings?.siret}`, 15, 68);
    doc.setFontSize(22).setTextColor(...primaryColor).text("FACTURE", 150, 25, { align: 'right' });
    doc.setFontSize(10).setTextColor(100).text(`N° ${f.numero_facture}`, 150, 32, { align: 'right' });
    doc.text(`Date : ${new Date(f.date_facture).toLocaleDateString('fr-FR')}`, 150, 38, { align: 'right' });
    doc.setFillColor(248, 250, 252).roundedRect(120, 50, 80, 40, 2, 2, 'F');
    doc.setTextColor(0).setFont("helvetica", "bold").text("Client", 125, 58);
    doc.setFont("helvetica", "normal");
    if (client) { doc.text(`${client.nom} ${client.prenom}`, 125, 65); doc.text(client.adresse || "", 125, 71); }
    const tableBody = (f.items || []).map(item => [item.description, item.quantity, `${item.unitPrice.toFixed(2)} €`, `${item.total.toFixed(2)} €`]);
    autoTable(doc, { startY: 100, head: [['Description', 'Qté', 'Prix Unit.', 'Total HT']], body: tableBody, headStyles: { fillColor: primaryColor, textColor: 255 } });
    return doc;
  };

  const handleDownloadPDF = (f: Facture) => { if (!settings) { onNotify("error", t('common.error'), t('settings.subtitle')); return; } const doc = createPDFDoc(f); doc.save(`Facture_${f.numero_facture}.pdf`); };

  const handleSendEmail = async (f: Facture, isRelance = false) => {
    const client = customers.find(c => c.id === f.client_id);
    if (!client || !client.email) { onNotify("error", t('common.error'), "Email manquant."); return; }
    setSendingEmail(f.id);
    try {
      const doc = createPDFDoc(f);
      const pdfBlob = doc.output('blob');
      const longUrl = await api.uploadDocument(`facture_${f.numero_facture}.pdf`, pdfBlob);
      const garageName = settings?.nom || 'Votre Garage';
      const resteAPayer = (f.montant_ttc - (f.acompte || 0)).toFixed(2);
      const dateFacture = new Date(f.date_facture).toLocaleDateString(locale);

      const subject = isRelance 
        ? encodeURIComponent(`Relance : Votre facture ${f.numero_facture} - ${garageName}`)
        : encodeURIComponent(`Votre facture ${f.numero_facture} - ${garageName}`);

      const bodyContent = isRelance
        ? `Bonjour ${client.prenom} ${client.nom},\n\nJ'espère que vous allez bien.\n\nJe me permets de vous solliciter concernant le règlement de la facture n° ${f.numero_facture} du ${dateFacture}, d'un montant restant de ${resteAPayer} €.\n\nSauf erreur de notre part, ce règlement ne nous est pas encore parvenu.\n\n📄 TÉLÉCHARGER VOTRE FACTURE :\n${longUrl}\n\nMerci de procéder à la régularisation dès que possible.\n\nCordialement,\n\n${garageName}`
        : `Bonjour ${client.prenom} ${client.nom},\n\nVeuillez trouver ci-joint votre facture n° ${f.numero_facture} du ${dateFacture}.\n\nLe montant total est de ${f.montant_ttc.toFixed(2)} €.\n\n📄 TÉLÉCHARGER VOTRE FACTURE :\n${longUrl}\n\nCordialement,\n\n${garageName}`;

      const body = encodeURIComponent(bodyContent);
      window.location.href = `mailto:${client.email}?subject=${subject}&body=${body}`;
      
      if (!isRelance) await onUpdate(f.id, { statut: 'non_payee' });
      onNotify("success", "Email", isRelance ? "Relance préparée." : "Facture préparée.");
    } catch (err: any) { onNotify("error", t('common.error'), err.message); }
    finally { setSendingEmail(null); }
  };

  const confirmDelete = async () => { if (!invoiceToDelete) return; setDeleteLoading(true); try { await onDelete(invoiceToDelete.id); setInvoiceToDelete(null); onNotify("success", t('settings.save_success'), "Facture supprimée."); } catch (error) { onNotify("error", t('common.error'), t('common.error_delete')); } finally { setDeleteLoading(false); } };
  const calculateDelay = (dateStr: string) => { const today = new Date(); today.setHours(0, 0, 0, 0); const invDate = new Date(dateStr); invDate.setHours(0, 0, 0, 0); const diffTime = today.getTime() - invDate.getTime(); return Math.floor(diffTime / (1000 * 60 * 60 * 24)); };

  const getStatusLabel = (s: Facture['statut']) => {
    switch(s) {
      case 'brouillon': return t('invoices.status_draft');
      case 'non_payee': return t('invoices.status_pending');
      case 'payee': return t('invoices.status_paid');
      case 'annule': return t('invoices.status_cancelled');
      default: return s;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Modal Changement Statut Manuel */}
      {statusUpdateInvoice && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setStatusUpdateInvoice(null)}>
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl border dark:border-slate-800 animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 text-center">{t('common.edit')}</h3>
                <div className="grid grid-cols-1 gap-2">
                    <button onClick={() => handleChangeStatus('brouillon')} className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm">{t('invoices.status_draft')}</button>
                    <button onClick={() => handleChangeStatus('non_payee')} className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-bold text-sm">{t('invoices.status_pending')}</button>
                    <button onClick={() => handleChangeStatus('payee')} className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold text-sm">{t('invoices.status_paid')}</button>
                    <button onClick={() => handleChangeStatus('annule')} className="p-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 font-bold text-sm">{t('invoices.status_cancelled')}</button>
                </div>
            </div>
        </div>
      )}

      {invoiceToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setInvoiceToDelete(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative border dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
             <h3 className="text-xl font-black text-center mb-6">{t('invoices.delete_title')}</h3>
             <div className="flex flex-col gap-3"><button onClick={confirmDelete} disabled={deleteLoading} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl uppercase text-xs tracking-widest">{deleteLoading ? "..." : t('customers.delete_confirm')}</button><button onClick={() => setInvoiceToDelete(null)} className="w-full py-4 bg-slate-100 dark:bg-slate-800 font-black rounded-2xl uppercase text-xs tracking-widest">{t('common.cancel')}</button></div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[2.5rem] w-full max-w-4xl shadow-2xl relative flex flex-col max-h-[95vh] overflow-hidden border dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50"><h2 className="text-xl font-black">{editingInvoice ? t('common.edit') : t('invoices.add_btn')}</h2><button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400">{t('quotes.col_client')}</label><select required className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-bold" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}><option value="">{t('common.select')}</option>{customers.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400">{t('nav.vehicles')}</label><select required className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-bold" value={formData.vehicule_id} onChange={e => setFormData({...formData, vehicule_id: e.target.value})}><option value="">{t('common.select')}</option>{vehicles.filter(v => v.client_id === formData.client_id).map(v => (<option key={v.id} value={v.id}>{v.marque} {v.modele} - {v.immatriculation}</option>))}</select></div>
                <div className="space-y-1"><DatePicker label={t('common.date')} value={formData.date_facture} onChange={d => setFormData({...formData, date_facture: d})} /></div>
              </div>
              
              {/* TABLEAU DES ITEMS REDESIGNÉ */}
              <div className="space-y-3">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead className="bg-slate-100 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="p-3 rounded-l-xl w-[45%]">{t('common.description')}</th>
                      <th className="p-3 text-center w-[15%]">{t('common.quantity')}</th>
                      <th className="p-3 text-right w-[20%]">{t('common.price_unit')}</th>
                      <th className="p-3 text-right w-[15%]">{t('quotes.total_ht')}</th>
                      <th className="p-3 rounded-r-xl w-[5%]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="group">
                        <td className="p-1">
                          <input 
                            placeholder="Ex: Diagnostic électronique" 
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 transition-all" 
                            value={item.description} 
                            onChange={e => updateItem(idx, 'description', e.target.value)} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            placeholder="1" 
                            type="number" 
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-center text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 transition-all" 
                            value={item.quantity} 
                            onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            placeholder="0.00" 
                            type="number" 
                            step="0.01" 
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-right text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 transition-all" 
                            value={item.unitPrice} 
                            onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value))} 
                          />
                        </td>
                        <td className="p-3 text-right font-black text-sm text-slate-900 dark:text-white">
                          {item.total.toFixed(2)} €
                        </td>
                        <td className="p-1 text-center">
                          <button type="button" onClick={() => removeItem(idx)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" onClick={addItem} className="w-full py-3 bg-slate-50 dark:bg-slate-800/50 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                  {t('invoices.add_line')}
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-4"><div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400">{t('common.notes')}</label><textarea placeholder="..." className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl h-20 text-slate-900 dark:text-white" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div><div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400">{t('invoices.form_deposit')}</label><input placeholder="0.00" type="number" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-bold" value={formData.acompte} onChange={e => setFormData({...formData, acompte: parseFloat(e.target.value) || 0})} /></div></div>
                <div className="w-full md:w-72 bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20 space-y-3"><div className="flex justify-between text-sm"><span>{t('quotes.total_ht')}</span><span>{totals.ht.toFixed(2)} €</span></div><div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400"><span>{t('quotes.vat')} ({currentVat}%)</span><span>{totals.tva.toFixed(2)} €</span></div>{totals.acompte > 0 && <div className="flex justify-between text-sm font-bold border-t pt-2"><span>{t('invoices.form_deposit')}</span><span>- {totals.acompte.toFixed(2)} €</span></div>}<div className="pt-3 border-t-2 border-emerald-200 flex justify-between text-xl font-black text-emerald-900 dark:text-emerald-300"><span>{t('invoices.form_to_pay')}</span><span>{totals.rest.toFixed(2)} €</span></div></div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest">{loading ? t('common.loading') : t('common.save')}</button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div><h3 className="text-2xl font-black text-[#1e293b] dark:text-white">{t('invoices.title')}</h3><p className="text-slate-500 font-medium">{t('invoices.subtitle')}</p></div>
        <button id="inv-add-btn" onClick={() => { setEditingInvoice(null); setIsModalOpen(true); }} className="w-full lg:w-auto px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>{t('invoices.add_btn')}</button>
      </div>

      <div id="inv-filters" className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
        <input type="text" placeholder={t('invoices.search_placeholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold" />
        <select className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">{t('common.all')}</option><option value="payee">{t('invoices.status_paid')}</option><option value="non_payee">{t('invoices.status_pending')}</option><option value="brouillon">{t('invoices.status_draft')}</option></select>
      </div>

      <div id="inv-list" className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm overflow-hidden border border-slate-100 dark:border-slate-800 min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t('quotes.col_ref')}</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t('quotes.col_client')}</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t('quotes.col_date')}</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t('quotes.col_amount')}</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t('quotes.col_status')}</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.length === 0 ? (<tr><td colSpan={6} className="py-20 text-center"><p className="text-slate-400 dark:text-slate-500 font-bold italic">{t('invoices.no_data')}</p></td></tr>) : (
                filteredInvoices.map((inv) => {
                  const client = customers.find(c => c.id === inv.client_id);
                  const delay = calculateDelay(inv.date_facture);
                  const isOverdue = inv.statut === 'non_payee' && delay >= 7;
                  return (<tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group"><td className="px-6 py-5 font-bold text-slate-700 dark:text-slate-200">{inv.numero_facture}</td><td className="px-6 py-5 font-bold text-slate-800 dark:text-white">{client ? `${client.nom} ${client.prenom}` : 'Inconnu'}</td><td className="px-6 py-5 text-sm text-slate-500">{inv.date_facture}</td><td className="px-6 py-5 font-black text-slate-900 dark:text-white">{inv.montant_ttc.toFixed(2)} €</td><td className="px-6 py-5"><div className="flex flex-col gap-1"><button onClick={() => setStatusUpdateInvoice(inv)} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase w-fit border transition-all active:scale-95 hover:shadow-sm ${inv.statut === 'payee' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : inv.statut === 'non_payee' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{getStatusLabel(inv.statut)}</button>{isOverdue && (<span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-lg animate-pulse flex items-center gap-1 w-fit shadow-lg shadow-rose-500/20"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>{t('invoices.overdue')}</span>)}</div></td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                        {inv.statut === 'brouillon' && (
                          <button onClick={() => handleSendEmail(inv)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all" title={t('quotes.action_send')}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          </button>
                        )}
                        {inv.statut === 'non_payee' && (
                          <button onClick={() => handleSendEmail(inv, true)} className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all" title={t('invoices.action_remind')}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </button>
                        )}
                        <button onClick={() => handleDownloadPDF(inv)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title={t('quotes.action_download')}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                        <button onClick={() => { setEditingInvoice(inv); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-lg transition-all" title={t('common.edit')}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => setInvoiceToDelete(inv)} className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all" title={t('common.delete')}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                  </td></tr>);
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
