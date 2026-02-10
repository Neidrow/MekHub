
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RendezVous, Client, Vehicule, Mecanicien, ViewState } from '../types';
import DatePicker from './DatePicker';
import { useLanguage } from '../contexts/LanguageContext';

interface AppointmentsProps {
  appointments: RendezVous[];
  customers: Client[];
  vehicles: Vehicule[];
  mecaniciens: Mecanicien[];
  onAddAppointment: (app: Omit<RendezVous, 'id' | 'user_id'>) => Promise<void>;
  onUpdateStatus: (id: string, status: RendezVous['statut']) => Promise<void>;
  onUpdateAppointment: (id: string, updates: Partial<RendezVous>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNavigate: (view: ViewState) => void;
}

const Appointments: React.FC<AppointmentsProps> = ({ 
  appointments, customers, vehicles, mecaniciens, 
  onAddAppointment, onUpdateStatus, onUpdateAppointment, onDelete, onNavigate
}) => {
  const { t, locale, language } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRDV, setEditingRDV] = useState<RendezVous | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appointmentToDelete, setAppointmentToDelete] = useState<RendezVous | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [viewDate, setViewDate] = useState(new Date());
  const [filterClient, setFilterClient] = useState('');
  const [filterMechanic, setFilterMechanic] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({ client_id: '', vehicule_id: '', mecanicien_id: '', type_intervention: '', date: todayStr, heure: '09:00', duree: '1h', description: '', notes: '', statut: 'en_attente' as RendezVous['statut'] });

  const handlePrevMonth = () => { const newDate = new Date(viewDate); newDate.setMonth(newDate.getMonth() - 1); setViewDate(newDate); };
  const handleNextMonth = () => { const newDate = new Date(viewDate); newDate.setMonth(newDate.getMonth() + 1); setViewDate(newDate); };
  const handleToday = () => { const now = new Date(); setViewDate(now); setSelectedDate(todayStr); };

  const timelineDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      const dateStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
      return { 
        dateStr, 
        dayName: d.toLocaleDateString(locale, { weekday: 'short' }), 
        dayNum: d.getDate(), 
        month: d.toLocaleDateString(locale, { month: 'short' }) 
      };
    });
  }, [viewDate, locale]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      const matchesDate = app.date === selectedDate;
      const matchesClient = filterClient ? app.client_id === filterClient : true;
      const matchesMechanic = filterMechanic ? app.mecanicien_id === filterMechanic : true;
      let matchesSearch = true;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const client = customers.find(c => c.id === app.client_id);
        const vehicle = vehicles.find(v => v.id === app.vehicule_id);
        matchesSearch = app.type_intervention.toLowerCase().includes(query) || (client?.nom?.toLowerCase() || '').includes(query) || (client?.prenom?.toLowerCase() || '').includes(query) || (vehicle?.immatriculation?.toLowerCase() || '').includes(query);
      }
      return matchesDate && matchesClient && matchesMechanic && matchesSearch;
    }).sort((a, b) => a.heure.localeCompare(b.heure));
  }, [appointments, selectedDate, filterClient, filterMechanic, searchQuery, customers, vehicles]);

  useEffect(() => {
    if (editingRDV) setFormData({ client_id: editingRDV.client_id, vehicule_id: editingRDV.vehicule_id, mecanicien_id: editingRDV.mecanicien_id || '', type_intervention: editingRDV.type_intervention, date: editingRDV.date, heure: editingRDV.heure, duree: editingRDV.duree, description: editingRDV.description || '', notes: editingRDV.notes || '', statut: editingRDV.statut });
    else setFormData({ client_id: '', vehicule_id: '', mecanicien_id: '', type_intervention: '', date: selectedDate, heure: '09:00', duree: '1h', description: '', notes: '', statut: 'en_attente' });
    setError('');
  }, [editingRDV, isModalOpen, selectedDate]);

  const checkMechanicAvailability = (mechId: string, date: string, time: string, duration: string, excludeId?: string): boolean => {
    let durationMin = 60;
    if (duration.includes('m')) durationMin = parseInt(duration);
    else if (duration.includes('h')) durationMin = parseInt(duration) * 60;

    const [h, m] = time.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + durationMin;

    const conflicts = appointments.filter(a => {
        if (a.id === excludeId) return false;
        if (a.statut === 'annule') return false;
        if (a.mecanicien_id !== mechId) return false;
        if (a.date !== date) return false;

        let aDurationMin = 60;
        if (a.duree.includes('m')) aDurationMin = parseInt(a.duree);
        else if (a.duree.includes('h')) aDurationMin = parseInt(a.duree) * 60;

        const [ah, am] = a.heure.split(':').map(Number);
        const aStart = ah * 60 + am;
        const aEnd = aStart + aDurationMin;

        return (startMin < aEnd && endMin > aStart);
    });

    return conflicts.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.mecanicien_id) { setError(t('appointments.error_mechanic')); return; }
    
    const isAvailable = checkMechanicAvailability(
        formData.mecanicien_id, 
        formData.date, 
        formData.heure, 
        formData.duree, 
        editingRDV?.id
    );

    if (!isAvailable) {
        setError(t('appointments.error_conflict'));
        return;
    }

    setLoading(true);
    try {
      if (editingRDV) await onUpdateAppointment(editingRDV.id, formData);
      else await onAddAppointment(formData);
      handleClose();
    } catch (err: any) { setError(t('common.error_save')); }
    finally { setLoading(false); }
  };

  const handleClose = () => { setIsModalOpen(false); setEditingRDV(null); setError(''); };
  const handleEdit = (app: RendezVous) => { setEditingRDV(app); setIsModalOpen(true); };
  const confirmDelete = async () => { if (!appointmentToDelete) return; setDeleteLoading(true); try { await onDelete(appointmentToDelete.id); setAppointmentToDelete(null); } catch (error) { alert(t('common.error_delete')); } finally { setDeleteLoading(false); } };

  const getCardStyle = (status: RendezVous['statut']) => {
    switch(status) {
      case 'en_attente': 
        return 'border-l-4 border-l-blue-500 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md';
      case 'en_cours': 
        return 'border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-900/10 shadow-md ring-1 ring-amber-500/20';
      case 'termine': 
        return 'border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10 shadow-sm opacity-90 hover:opacity-100';
      case 'annule': 
        return 'border-l-4 border-l-rose-500 bg-rose-50/30 dark:bg-rose-900/10 shadow-none opacity-75 grayscale-[0.5]';
      default: 
        return 'border-l-4 border-l-slate-300 bg-white dark:bg-slate-900';
    }
  };

  const getStatusBadgeStyle = (status: RendezVous['statut']) => {
    switch(status) {
      case 'en_attente': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
      case 'en_cours': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 animate-pulse';
      case 'termine': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
      case 'annule': return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const statusLabels: Record<string, string> = {
    'en_attente': t('appointments.status_pending'),
    'en_cours': t('appointments.status_progress'),
    'termine': t('appointments.status_done'),
    'annule': t('appointments.status_cancelled')
  };

  const formattedMonth = viewDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 min-h-[80vh] flex flex-col">
      {appointmentToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setAppointmentToDelete(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-300 flex flex-col border dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
             <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
             <h3 className="text-xl font-black text-slate-800 dark:text-white text-center mb-2">{t('appointments.delete_title')}</h3>
             <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-8 leading-relaxed"><span className="font-bold text-slate-700 dark:text-slate-300">{appointmentToDelete.type_intervention}</span></p>
             <div className="flex flex-col gap-3"><button onClick={confirmDelete} disabled={deleteLoading} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">{deleteLoading ? (<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>) : t('appointments.delete_confirm')}</button><button onClick={() => setAppointmentToDelete(null)} disabled={deleteLoading} className="w-full py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs">{t('common.cancel')}</button></div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div><h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{t('appointments.title')}</h3><p className="text-slate-500 dark:text-slate-400 font-medium">{t('nav.workshop_manager')}</p></div>
          <button id="agenda-add-btn" onClick={() => { setEditingRDV(null); setIsModalOpen(true); }} className="w-full lg:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 active:scale-95 flex items-center justify-center gap-2 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>{t('dashboard.quick_add')}</button>
        </div>
        <div id="agenda-filters" className="flex flex-col lg:flex-row gap-4"><div className="flex-1 relative"><svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><input type="text" placeholder={t('common.search')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all" /></div><div className="w-full lg:w-64 relative"><select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 appearance-none transition-all cursor-pointer"><option value="">{t('nav.customers')}</option>{customers.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select><svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></div><div className="w-full lg:w-64 relative"><select value={filterMechanic} onChange={e => setFilterMechanic(e.target.value)} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 appearance-none transition-all cursor-pointer"><option value="">{t('nav.mechanics')}</option>{mecaniciens.map(m => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}</select><svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></div></div>
      </div>

      <div className="space-y-4">
        <div id="agenda-nav" className="flex items-center justify-between px-2">
           <div className="flex items-center gap-4"><button onClick={handlePrevMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg></button><h2 className="text-xl font-black text-slate-800 dark:text-white capitalize min-w-[150px] text-center">{formattedMonth}</h2><button onClick={handleNextMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg></button></div>
           <button onClick={handleToday} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">{t('common.today')}</button>
        </div>
        <div id="agenda-timeline" className="overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0" ref={scrollRef}>
          <div className="flex gap-3 min-w-max">
            {timelineDays.map((day) => {
               const isSelected = day.dateStr === selectedDate;
               const isToday = day.dateStr === todayStr;
               const count = appointments.filter(a => a.date === day.dateStr).length;
               return (<button key={day.dateStr} onClick={() => setSelectedDate(day.dateStr)} className={`flex flex-col items-center justify-center p-4 rounded-3xl min-w-[5.5rem] transition-all duration-300 border-2 ${isSelected ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xl scale-105 z-10' : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-100 dark:hover:border-slate-800'}`}><span className="text-[10px] font-black uppercase tracking-widest mb-1">{isToday ? (language === 'fr' ? 'AUJ' : 'TDY') : day.dayName}</span><span className={`text-2xl font-black mb-1 ${isSelected ? 'text-white dark:text-slate-900' : 'text-slate-800 dark:text-slate-200'}`}>{day.dayNum}</span>{count > 0 ? (<span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${isSelected ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>{count} RDV</span>) : (<span className={`h-4 w-4 rounded-full block ${isSelected ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-slate-800'}`}></span>)}</button>);
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1">
        {filteredAppointments.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]"><div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div><p className="text-slate-400 dark:text-slate-500 font-bold">{t('appointments.no_data')}</p></div>
        ) : (
          filteredAppointments.map((app) => {
            const customer = customers.find(c => c.id === app.client_id);
            const mechanic = mecaniciens.find(m => m.id === app.mecanicien_id);
            const vehicle = vehicles.find(v => v.id === app.vehicule_id);
            const isSynced = !!app.google_event_id;
            
            return (
              <div 
                key={app.id} 
                className={`rounded-[2.5rem] p-6 lg:p-8 transition-all group flex flex-col h-full relative animate-in zoom-in duration-300 ${getCardStyle(app.statut)}`}
              >
                <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700">
                  <div className={`w-1.5 h-1.5 rounded-full ${isSynced ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${isSynced ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>{isSynced ? t('appointments.google_synced') : t('appointments.local')}</span>
                </div>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-center min-w-[4.5rem] shadow-lg shadow-slate-200 dark:shadow-none">
                    <span className="block text-lg leading-none">{app.heure.split(':')[0]}</span>
                    <span className="block text-xs opacity-60">:{app.heure.split(':')[1]}</span>
                  </div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest mb-1 ${getStatusBadgeStyle(app.statut)}`}>
                      {statusLabels[app.statut]}
                    </span>
                    <h4 className="font-black text-slate-800 dark:text-white line-clamp-1 text-lg">{app.type_intervention}</h4>
                  </div>
                </div>

                <div className="space-y-3 mb-6 flex-grow">
                  <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-300 font-black text-xs shadow-sm">
                      {customer?.nom?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none mb-1 tracking-tighter">{t('common.client')}</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{customer?.nom} {customer?.prenom}</p>
                    </div>
                  </div>
                  {vehicle && (
                    <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-300 font-black text-xs shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.6 2 11.8 2 12v4c0 .6.4 1 1 1h2" /></svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none mb-1 tracking-tighter">{t('common.vehicle')}</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{vehicle.marque} {vehicle.modele} - <span className="text-xs text-slate-500 dark:text-slate-400">{vehicle.immatriculation}</span></p>
                      </div>
                    </div>
                  )}
                  {mechanic && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-500/10">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs shadow-sm">
                        {mechanic.prenom.charAt(0)}{mechanic.nom.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-blue-400 uppercase leading-none mb-1 tracking-tighter">{t('common.mechanic')}</p>
                        <p className="text-sm font-bold text-blue-900 dark:text-blue-300 truncate">{mechanic.prenom} {mechanic.nom}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('common.duration')}</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{app.duree}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(app)} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white hover:border-blue-600 dark:hover:border-blue-600 transition-all shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setAppointmentToDelete(app)} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white hover:border-rose-600 dark:hover:border-rose-600 transition-all shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={handleClose}>
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl sm:rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[95vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900"><div><h2 className="text-2xl font-black text-slate-800 dark:text-white">{editingRDV ? t('appointments.edit_title') : t('appointments.new_title')}</h2></div><button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto"><div className="grid grid-cols-1 sm:grid-cols-2 gap-5"><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('nav.customers')}</label><select required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value, vehicule_id: ''})}><option value="">{t('common.select')}</option>{customers.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('nav.vehicles')}</label><select required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={formData.vehicule_id} onChange={e => setFormData({...formData, vehicule_id: e.target.value})}><option value="">{t('common.select')}</option>{vehicles.filter(v => v.client_id === formData.client_id).map(v => (<option key={v.id} value={v.id}>{v.immatriculation} - {v.marque} {v.modele}</option>))}</select></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-5"><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('appointments.type')}</label><input required placeholder="Ex: Vidange, Révision, Pneus..." className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={formData.type_intervention} onChange={e => setFormData({...formData, type_intervention: e.target.value})} /></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('nav.mechanics')}</label><select required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={formData.mecanicien_id} onChange={e => setFormData({...formData, mecanicien_id: e.target.value})}><option value="">{t('common.select')}</option>{mecaniciens.map(m => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}</select></div></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div className="space-y-1"><DatePicker label={t('common.date')} required value={formData.date} onChange={(date) => setFormData({...formData, date})} /></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.time')}</label><input type="time" required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={formData.heure} onChange={e => setFormData({...formData, heure: e.target.value})} /></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.duration')}</label><select className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-900 dark:text-white" value={formData.duree} onChange={e => setFormData({...formData, duree: e.target.value})}><option value="30m">30 min</option><option value="1h">1 heure</option><option value="2h">2 heures</option><option value="3h">3 heures</option><option value="4h">4 heures</option><option value="8h">8 heures</option></select></div></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('appointments.status')}</label><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{(['en_attente', 'en_cours', 'termine', 'annule'] as const).map(s => (<button key={s} type="button" onClick={() => setFormData({...formData, statut: s})} className={`py-2 px-1 rounded-xl border-2 font-black text-[9px] uppercase tracking-tighter transition-all ${formData.statut === s ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-300'}`}>{statusLabels[s]}</button>))}</div></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.description')}</label><textarea placeholder="Détails du problème ou travaux à effectuer..." className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold h-24 text-slate-900 dark:text-white" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>{error && <div className="p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase text-center">{error}</div>}<button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95">{loading ? t('common.loading') : t('common.confirm')}</button></form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
