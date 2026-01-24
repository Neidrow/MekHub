
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
      const matchesSearch = d.numero_devis.toLowerCase().includes(searchTerm.toLowerCase()) || (client ? `${client.nom} ${client.prenom}` : '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch && (statusFilter === 'all' || d.statut === statusFilter);
    });
  }, [devis, customers, searchTerm, statusFilter]);

  useEffect(() => {
    if (editingDevis) {
      setFormData({ client_id: editingDevis.client_id, vehicule_id: editingDevis.vehicule_id || '', numero_devis: editingDevis.numero_devis, date_devis: editingDevis.date_devis, statut: editingDevis.statut, notes: editingDevis.notes || '' });
      setItems(editingDevis.items && editingDevis.items.length > 0 ? editingDevis.items : [{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    } else {
      setFormData({ client_id: '', vehicule_id: '', numero_devis: generateRef(), date_devis: new Date().toISOString().split('T')[0], statut: 'brouillon', notes: '' });
      setItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    }
  }, [editingDevis, duplicateSource, isModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData, items, montant_ht: items.reduce((acc, i) => acc + (i.total || 0), 0), montant_ttc: items.reduce((acc, i) => acc + (i.total || 0), 0) * (1 + currentModalVat/100) };
      if (editingDevis) await onUpdate(editingDevis.id, payload);
      else await onAdd(payload);
      setIsModalOpen(false);
      setEditingDevis(null);
    } catch (err: any) { onNotify("error", "Erreur", err.message); }
    finally { setLoading(false); }
  };

  const getStatusColor = (s: Devis['statut']) => { switch(s) { case 'brouillon': return 'bg-slate-100 text-slate-500'; case 'en_attente': return 'bg-amber-50 text-amber-600'; case 'accepte': return 'bg-emerald-50 text-emerald-600'; case 'refuse': return 'bg-rose-50 text-rose-600'; default: return 'bg-blue-50 text-blue-600'; } };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Modals... */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div><h3 className="text-2xl font-black text-[#1e293b] dark:text-white">Gestion des Devis</h3><p className="text-slate-500 dark:text-slate-400 font-medium">Créez et suivez vos devis clients.</p></div>
        <button id="tour-add-quote" onClick={() => { setEditingDevis(null); setIsModalOpen(true); }} className="w-full lg:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>Nouveau Devis
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1"><input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl font-bold outline-none" /></div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Référence</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Client</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Montant TTC</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Statut</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDevis.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-all">
                  <td className="px-6 py-5 font-bold">{d.numero_devis}</td>
                  <td className="px-6 py-5 font-bold">{customers.find(c => c.id === d.client_id)?.nom || 'Inconnu'}</td>
                  <td className="px-6 py-5 font-black">{d.montant_ttc.toFixed(2)} €</td>
                  <td className="px-6 py-5"><span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${getStatusColor(d.statut)}`}>{d.statut}</span></td>
                  <td className="px-6 py-5 text-right flex justify-end gap-2">
                    <button onClick={() => onNotify('info', 'PDF', 'Génération en cours...')} className="p-2 bg-slate-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4" /></svg></button>
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

export default Quotes;
