
import React, { useMemo, useState } from 'react';
import { Facture, RendezVous, Client } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';

interface StatisticsProps {
  invoices: Facture[];
  appointments: RendezVous[];
  customers: Client[];
}

const Statistics: React.FC<StatisticsProps> = ({ invoices, appointments, customers }) => {
  const { t, locale, language } = useLanguage();
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0); // 0 = Current, 1 = Last, 2 = 2 months ago

  const statsData = useMemo(() => {
    const today = new Date();
    const result = [];

    // Boucle sur les 3 derniers mois (0, 1, 2)
    for (let i = 0; i < 3; i++) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = targetDate.getMonth();
      const year = targetDate.getFullYear();
      
      const label = targetDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      const shortLabel = targetDate.toLocaleDateString(locale, { month: 'short' });

      // Filtrer les factures pour ce mois
      const monthInvoices = invoices.filter(inv => {
        const d = new Date(inv.date_facture);
        return d.getMonth() === month && d.getFullYear() === year && (inv.statut === 'payee' || (inv.statut === 'non_payee' && inv.acompte > 0));
      });

      // Calcul CA encaissé
      const revenue = monthInvoices.reduce((sum, inv) => {
        if (inv.statut === 'payee') return sum + (inv.montant_ttc || 0);
        if (inv.statut === 'non_payee') return sum + (inv.acompte || 0);
        return sum;
      }, 0);

      // RDV Terminés
      const completedAppointments = appointments.filter(app => {
        const d = new Date(app.date);
        return d.getMonth() === month && d.getFullYear() === year && app.statut === 'termine';
      }).length;

      result.push({
        index: i,
        label,
        shortLabel,
        revenue,
        appointments: completedAppointments,
        details: monthInvoices
      });
    }
    return result.reverse();
  }, [invoices, appointments, locale]);

  const selectedStats = statsData[statsData.length - 1 - selectedMonthIndex];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b] dark:text-white tracking-tight">{t('statistics.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">{t('statistics.subtitle')}</p>
        </div>
      </div>

      {/* --- Cartes Périodes --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((offset) => {
          const data = statsData[statsData.length - 1 - offset];
          const isSelected = selectedMonthIndex === offset;
          const monthLabel = offset === 0 ? t('statistics.current_month') : offset === 1 ? t('statistics.last_month') : t('statistics.two_months_ago');
          
          return (
            <button 
              key={offset}
              onClick={() => setSelectedMonthIndex(offset)}
              className={`p-6 rounded-[2rem] border-2 text-left transition-all duration-300 relative overflow-hidden group ${isSelected ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-600 text-white shadow-xl scale-105 z-10' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-slate-700'}`}
            >
              {isSelected && <div className="absolute top-0 right-0 p-4 opacity-10"><svg className="w-32 h-32 transform rotate-12 -mr-8 -mt-8" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg></div>}
              
              <p className={`text-xs font-black uppercase tracking-widest mb-2 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                {monthLabel}
              </p>
              <h3 className={`text-xl font-black capitalize mb-6 ${isSelected ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                {data.label}
              </h3>
              
              <div className="flex flex-col gap-2 relative z-10">
                <div className="flex items-baseline gap-2">
                   <span className={`text-3xl font-black ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                     {data.revenue.toLocaleString(locale)} {language === 'en' ? '$' : '€'}
                   </span>
                </div>
                <div className="flex items-center gap-2">
                   <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                     {data.appointments} {t('statistics.completed_appts')}
                   </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- Graphique --- */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm min-h-[450px] flex flex-col">
           <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8">{t('statistics.revenue_trend')}</h3>
           <div className="flex-1 w-full min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={statsData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                 <XAxis 
                    dataKey="shortLabel" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 12, fontWeight: '700', fill: '#94a3b8'}} 
                    dy={10}
                 />
                 <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 12, fontWeight: '700', fill: '#94a3b8'}} 
                    tickFormatter={(value) => `${value}`}
                 />
                 <Tooltip 
                    cursor={{fill: '#f1f5f9', radius: 16}} 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', backgroundColor: '#1e293b', color: '#fff', padding: '16px' }} 
                    itemStyle={{ fontWeight: '700', color: '#fff', fontSize: '16px' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}
                    formatter={(value: number) => [`${value} ${language === 'en' ? '$' : '€'}`, t('dashboard.monthly_revenue')]}
                 />
                 <Bar dataKey="revenue" radius={[16, 16, 0, 0]} barSize={60} animationDuration={1000}>
                    {statsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={statsData.length - 1 - index === selectedMonthIndex ? '#2563eb' : '#cbd5e1'} />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* --- Détail Factures --- */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col max-h-[550px]">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800 dark:text-white">{t('statistics.detail_title')} <span className="text-blue-600">{selectedStats.shortLabel}</span></h3>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{selectedStats.details.length} {t('statistics.invoices_count')}</span>
           </div>
           
           <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pr-2">
              {selectedStats.details.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                   <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4 animate-pulse">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                   </div>
                   <p className="text-sm font-bold text-slate-400 dark:text-slate-500">{t('statistics.no_data_period')}</p>
                </div>
              ) : (
                selectedStats.details.map((inv) => {
                  const client = customers.find(c => c.id === inv.client_id);
                  const amount = inv.statut === 'payee' ? inv.montant_ttc : inv.acompte;
                  
                  return (
                    <div key={inv.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 hover:-translate-y-0.5 transition-all">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-300 font-black text-xs">
                             {client?.nom?.charAt(0) || '?'}
                          </div>
                          <div>
                             <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{client ? `${client.nom} ${client.prenom}` : 'Client Inconnu'}</p>
                             <p className="text-[10px] font-bold text-slate-400 mt-0.5">{inv.numero_facture} • {new Date(inv.date_facture).toLocaleDateString(locale)}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">+{amount.toFixed(2)} {language === 'en' ? '$' : '€'}</p>
                          {inv.statut === 'non_payee' && <p className="text-[8px] font-bold text-amber-500 uppercase tracking-widest">{t('invoices.form_deposit')}</p>}
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

export default Statistics;
