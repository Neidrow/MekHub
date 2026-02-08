
import React, { useMemo, useState } from 'react';
import { Facture, RendezVous, Client } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface StatisticsProps {
  invoices: Facture[];
  appointments: RendezVous[];
  customers: Client[];
}

const Statistics: React.FC<StatisticsProps> = ({ invoices, appointments, customers }) => {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0); // 0 = Current, 1 = Last, 2 = 2 months ago

  const statsData = useMemo(() => {
    const today = new Date();
    const result = [];

    // Boucle sur les 3 derniers mois (0, 1, 2)
    for (let i = 0; i < 3; i++) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = targetDate.getMonth();
      const year = targetDate.getFullYear();
      
      const label = targetDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const shortLabel = targetDate.toLocaleDateString('fr-FR', { month: 'short' });

      // Filtrer les factures pour ce mois
      const monthInvoices = invoices.filter(inv => {
        const d = new Date(inv.date_facture);
        // On prend les factures dont la date correspond au mois
        // Critère "rapporté" : Statut payée ou acompte versé
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
    return result.reverse(); // Pour avoir l'ordre chronologique (M-2, M-1, M) dans le graph
  }, [invoices, appointments]);

  // Données pour le mois sélectionné (attention, statsData est inversé pour le graph)
  // Donc si selectedMonthIndex = 0 (Mois actuel), c'est le dernier élément du tableau reverse
  const selectedStats = statsData[statsData.length - 1 - selectedMonthIndex];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b] dark:text-white tracking-tight">Statistiques</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Analyse de la performance sur le trimestre.</p>
        </div>
      </div>

      {/* --- Cartes Périodes --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((offset) => {
          // On récupère les données correspondantes dans notre tableau inversé
          const data = statsData[statsData.length - 1 - offset];
          const isSelected = selectedMonthIndex === offset;
          
          return (
            <button 
              key={offset}
              onClick={() => setSelectedMonthIndex(offset)}
              className={`p-6 rounded-[2rem] border-2 text-left transition-all duration-300 relative overflow-hidden group ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-105 z-10' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-slate-700'}`}
            >
              {isSelected && <div className="absolute top-0 right-0 p-4 opacity-10"><svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg></div>}
              
              <p className={`text-xs font-black uppercase tracking-widest mb-2 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                {offset === 0 ? 'Mois en cours' : offset === 1 ? 'Mois dernier' : 'Il y a 2 mois'}
              </p>
              <h3 className={`text-xl font-black capitalize mb-4 ${isSelected ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                {data.label}
              </h3>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                   <span className={`text-3xl font-black ${isSelected ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>
                     {data.revenue.toLocaleString('fr-FR')} €
                   </span>
                   <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>CA Encaissé</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                   <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                     {data.appointments} RDV Terminés
                   </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- Graphique --- */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm min-h-[400px]">
           <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8">Évolution du Chiffre d'Affaires</h3>
           <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={statsData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
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
                    tickFormatter={(value) => `${value}€`}
                 />
                 <Tooltip 
                    cursor={{fill: '#f1f5f9', radius: 10}} 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)', backgroundColor: '#1e293b', color: '#fff', padding: '12px 20px' }} 
                    itemStyle={{ fontWeight: '700', color: '#fff' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '5px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}
                    formatter={(value: number) => [`${value} €`, 'Chiffre d\'Affaires']}
                 />
                 <Bar dataKey="revenue" radius={[12, 12, 0, 0]} barSize={60}>
                    {statsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={statsData.length - 1 - index === selectedMonthIndex ? '#2563eb' : '#cbd5e1'} />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* --- Détail Factures --- */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col max-h-[500px]">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Détail {selectedStats.shortLabel}</h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">{selectedStats.details.length} factures</span>
           </div>
           
           <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pr-2">
              {selectedStats.details.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                   <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                   </div>
                   <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Aucun encaissement sur cette période.</p>
                </div>
              ) : (
                selectedStats.details.map((inv) => {
                  const client = customers.find(c => c.id === inv.client_id);
                  const amount = inv.statut === 'payee' ? inv.montant_ttc : inv.acompte;
                  
                  return (
                    <div key={inv.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                       <div>
                          <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{client ? `${client.nom} ${client.prenom}` : 'Client Inconnu'}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">{inv.numero_facture} • {new Date(inv.date_facture).toLocaleDateString()}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">+{amount.toFixed(2)} €</p>
                          {inv.statut === 'non_payee' && <p className="text-[8px] font-bold text-amber-500 uppercase tracking-widest">Acompte</p>}
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
