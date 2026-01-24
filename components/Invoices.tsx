
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const generateRef = () => { const now = new Date(); const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, ''); return `F-${now.getFullYear()}-${dateStr.slice(4)}-${timeStr}`; };
  const [formData, setFormData] = useState({ client_id: '', vehicule_id: '', numero_facture: generateRef(), date_facture: new Date().toISOString().split('T')[0], statut: 'brouillon' as Facture['statut'], acompte: 0, notes: '' });
  const [items, setItems] = useState<InvoiceItem[]>([{ description: 'Forfait Révision', quantity: 1, unitPrice: 80, total: 80 }]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const client = customers.find(c => c.id === inv.client_id);
      const matchesSearch = inv.numero_facture.toLowerCase().includes(searchTerm.toLowerCase()) || (client ? `${client.nom} ${client.prenom}` : '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch && (statusFilter === 'all' || inv.statut === statusFilter);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicule_id) { onNotify("error", "Erreur", "Choisir un véhicule."); return; }
    setLoading(true);
    try {
      const ht = items.reduce((acc, i) => acc + (i.total || 0), 0);
      const payload = { ...formData, items, montant_ht: ht, tva: ht * 0.2, montant_ttc: ht * 1.2, montant_paye: ht * 1.2 - formData.acompte };
      if (editingInvoice) await onUpdate(editingInvoice.id, payload);
      else await onAdd(payload);
      setIsModalOpen(false);
      setEditingInvoice(null);
    } catch (err: any) { onNotify("error", "Erreur", err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Modals... */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div><h3 className="text-2xl font-black text-[#1e293b] dark:text-white">Facturation</h3><p className="text-slate-500 dark:text-slate-400 font-medium">Suivi des paiements.</p></div>
        <button id="tour-add-invoice" onClick={() => { setEditingInvoice(null); setIsModalOpen(true); }} className="w-full lg:w-auto px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>Nouvelle Facture
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
        <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl font-bold outline-none" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm overflow-hidden border border-slate-100 dark:border-slate-800 min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Référence</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Client</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-all">
                  <td className="px-6 py-5 font-bold">{inv.numero_facture}</td>
                  <td className="px-6 py-5 font-bold">{customers.find(c => c.id === inv.client_id)?.nom || 'Inconnu'}</td>
                  <td className="px-6 py-5 text-right flex justify-end gap-2">
                    <button className="p-2 bg-slate-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1" /></svg></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Invoices;
