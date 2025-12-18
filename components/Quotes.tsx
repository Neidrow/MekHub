
import React from 'react';
import { Devis } from '../types';

interface QuotesProps {
  devis: Devis[];
}

const Quotes: React.FC<QuotesProps> = ({ devis }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black text-[#1e293b]">Gestion des Devis</h3>
        <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
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
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Référence</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Montant TTC</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Statut</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devis.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-all">
                  <td className="px-8 py-5 font-bold text-slate-700">#{d.numero_devis}</td>
                  <td className="px-8 py-5 text-sm text-slate-500">{d.date_devis}</td>
                  <td className="px-8 py-5 font-black text-slate-900">{d.montant_ttc.toFixed(2)} €</td>
                  <td className="px-8 py-5">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${
                      d.statut === 'accepte' ? 'bg-emerald-50 text-emerald-600' :
                      d.statut === 'refuse' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {d.statut}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right space-x-3">
                    <button className="text-blue-600 font-black text-[10px] uppercase hover:underline">Modifier</button>
                    <button className="text-slate-400 font-black text-[10px] uppercase hover:underline">PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Quotes;
