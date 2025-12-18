
import React, { useState, useEffect } from 'react';
import { ViewState, Client, Vehicule, RendezVous, Facture, Devis, StockItem, Mecanicien, GarageSettings } from './types';
import { ICONS } from './constants';
import { api, supabase } from './services/api';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Appointments from './components/Appointments';
import Customers from './components/Customers';
import Vehicles from './components/Vehicles';
import Quotes from './components/Quotes';
import Invoices from './components/Invoices';
import Inventory from './components/Inventory';
import AIAssistant from './components/AIAssistant';
import Settings from './components/Settings';
import Mechanics from './components/Mechanics';
import SuperAdmin from './components/SuperAdmin';

interface NavItemProps {
  view: ViewState;
  label: string;
  icon: React.FC;
  color?: string;
  currentView: ViewState;
  onClick: (view: ViewState) => void;
}

const NavItem: React.FC<NavItemProps> = ({ view, label, icon: Icon, color = 'blue', currentView, onClick }) => {
  const isActive = currentView === view;
  const baseClasses = "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all w-full group";
  
  // Dynamic color handling for active state
  const getActiveClasses = () => {
    if (!isActive) return "text-slate-500 hover:bg-slate-100 hover:text-slate-800";
    if (color === 'purple') return "bg-purple-600 text-white shadow-xl shadow-purple-500/20";
    return "bg-blue-600 text-white shadow-xl shadow-blue-500/20";
  };

  return (
    <button
      onClick={() => onClick(view)}
      className={`${baseClasses} ${getActiveClasses()}`}
    >
      <div className={`transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}`}>
        <Icon />
      </div>
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </button>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [rendezVous, setRendezVous] = useState<RendezVous[]>([]);
  const [mecaniciens, setMecaniciens] = useState<Mecanicien[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [settings, setSettings] = useState<GarageSettings | null>(null);

  // État pour le modal de changement de mot de passe
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      handleSession(sess);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      handleSession(sess);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = (sess: any) => {
    setSession(sess);
    if (sess) {
      const metadata = sess.user?.user_metadata || {};
      const needsChange = metadata.needs_password_change;
      
      // CRITIQUE : Définit la vue par défaut selon le rôle au moment de la session
      if (metadata.role === 'super_admin') {
        setCurrentView('super-admin');
      } else {
        setCurrentView('dashboard');
      }

      if (needsChange) {
        setMustChangePassword(true);
        setLoading(false);
      } else {
        setMustChangePassword(false);
        loadAllData();
      }
    } else {
      resetData();
    }
  };

  const resetData = () => {
    setClients([]);
    setVehicules([]);
    setRendezVous([]);
    setMecaniciens([]);
    setStock([]);
    setDevis([]);
    setFactures([]);
    setSettings(null);
    setLoading(false);
    setMustChangePassword(false);
    setCurrentView('dashboard'); // Reset de la vue à la déconnexion
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [c, v, a, m, s, d, f, sett] = await Promise.all([
        api.fetchData<Client>('clients'),
        api.fetchData<Vehicule>('vehicules'),
        api.fetchData<RendezVous>('rendez_vous'),
        api.fetchData<Mecanicien>('mecaniciens'),
        api.fetchData<StockItem>('stock'),
        api.fetchData<Devis>('devis'),
        api.fetchData<Facture>('factures'),
        api.getSettings(),
      ]);
      setClients(c);
      setVehicules(v);
      setRendezVous(a);
      setMecaniciens(m);
      setStock(s);
      setDevis(d);
      setFactures(f);
      setSettings(sett);
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (newPass.length < 6) return setPassError('Minimum 6 caractères');
    if (newPass !== confirmPass) return setPassError('Les mots de passe divergent');

    setPassLoading(true);
    try {
      await api.updatePassword(newPass);
      setMustChangePassword(false);
      loadAllData();
    } catch (err: any) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  if (loading && !session) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Initialisation GaragePro...</p>
      </div>
    );
  }

  if (!session) {
    return <Auth onLogin={(sess) => handleSession(sess)} />;
  }

  const userMetadata = session.user?.user_metadata || {};
  const garageDisplayName = settings?.nom || userMetadata.garage_name || "Nouveau Garage";
  const isSuperAdmin = userMetadata.role === 'super_admin';

  const navigateTo = (view: ViewState) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-[#1e293b]">
      {mustChangePassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-10 lg:p-12 animate-in zoom-in duration-300">
            <div className="text-center mb-8">
               <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
               </div>
               <h2 className="text-2xl font-black text-slate-800">Sécurisez votre compte</h2>
               <p className="text-slate-500 text-sm mt-2">Veuillez définir votre mot de passe définitif.</p>
            </div>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nouveau mot de passe</label>
                 <input required type="password" placeholder="••••••••" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold" value={newPass} onChange={e => setNewPass(e.target.value)} />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmer</label>
                 <input required type="password" placeholder="••••••••" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
               </div>
               {passError && <p className="text-rose-500 text-xs font-bold text-center">{passError}</p>}
               <button disabled={passLoading} type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 mt-6">
                 {passLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Activer mon compte"}
               </button>
               <button type="button" onClick={() => api.logout()} className="w-full text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors">Déconnexion</button>
            </form>
          </div>
        </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}

      <aside className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-100 flex flex-col z-40 transition-transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 bg-gradient-to-br ${isSuperAdmin ? 'from-purple-600 to-indigo-700' : 'from-blue-600 to-indigo-700'} rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20 uppercase`}>
              {garageDisplayName.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-slate-800 truncate">{garageDisplayName}</h1>
              <p className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">{isSuperAdmin ? 'Master Plateforme' : 'Gestion Atelier'}</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {isSuperAdmin && (
            <div className="mb-6">
              <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 text-purple-600">SaaS Control</p>
              <NavItem view="super-admin" label="Dashboard Master" icon={ICONS.Dashboard} color="purple" currentView={currentView} onClick={navigateTo} />
            </div>
          )}
          
          <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Atelier</p>
          <NavItem view="dashboard" label="Dashboard" icon={ICONS.Dashboard} currentView={currentView} onClick={navigateTo} />
          <NavItem view="appointments" label="RDV" icon={ICONS.Appointments} currentView={currentView} onClick={navigateTo} />
          <NavItem view="customers" label="Clients" icon={ICONS.Customers} currentView={currentView} onClick={navigateTo} />
          <NavItem view="vehicles" label="Véhicules" icon={ICONS.Vehicles} currentView={currentView} onClick={navigateTo} />
          <NavItem view="mechanics" label="Équipe" icon={ICONS.Mechanics} currentView={currentView} onClick={navigateTo} />
          
          <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 mt-4 text-slate-300">Commerce</p>
          <NavItem view="inventory" label="Stocks" icon={ICONS.Inventory} currentView={currentView} onClick={navigateTo} />
          <NavItem view="quotes" label="Devis" icon={ICONS.Quotes} currentView={currentView} onClick={navigateTo} />
          <NavItem view="invoices" label="Factures" icon={ICONS.Invoices} currentView={currentView} onClick={navigateTo} />
          <NavItem view="ai-assistant" label="Gemini AI" icon={ICONS.AI} currentView={currentView} onClick={navigateTo} />
        </nav>

        <div className="p-4 border-t border-slate-50 space-y-2">
          <NavItem view="settings" label="Paramètres" icon={ICONS.Settings} currentView={currentView} onClick={navigateTo} />
          <button onClick={() => api.logout()} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all w-full font-bold text-sm">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
             Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 flex flex-col min-w-0">
        <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-4 lg:px-10 sticky top-0 z-20">
          <button className="lg:hidden p-2 text-slate-600" onClick={() => setIsSidebarOpen(true)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          
          <div className="flex items-center gap-4">
             {loading && <div className="flex items-center gap-2 animate-pulse"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div><span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Sync</span></div>}
             <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{session.user?.email}</span>
             </div>
          </div>
        </header>

        <div className="p-4 lg:p-10 flex-1 overflow-y-auto">
          {currentView === 'super-admin' && isSuperAdmin && <SuperAdmin />}
          {currentView === 'dashboard' && <Dashboard customers={clients} vehicles={vehicules} appointments={rendezVous} onAddAppointment={async (app) => { await api.postData('rendez_vous', app); loadAllData(); }} onNavigate={navigateTo} />}
          {currentView === 'customers' && <Customers customers={clients} onAddCustomer={async (c) => { await api.postData('clients', c); loadAllData(); }} />}
          {currentView === 'inventory' && <Inventory inventory={stock} onAddItem={async (item) => { await api.postData('stock', item); loadAllData(); }} />}
          {currentView === 'appointments' && <Appointments appointments={rendezVous} customers={clients} vehicles={vehicules} />}
          {currentView === 'vehicles' && <Vehicles vehicles={vehicules} customers={clients} />}
          {currentView === 'mechanics' && <Mechanics mechanics={mecaniciens} onAdd={async (m) => { await api.postData('mecaniciens', m); loadAllData(); }} />}
          {currentView === 'quotes' && <Quotes devis={devis} />}
          {currentView === 'invoices' && <Invoices invoices={factures} />}
          {currentView === 'ai-assistant' && <AIAssistant />}
          {currentView === 'settings' && <Settings initialSettings={settings} onSave={async (s) => { await api.saveSettings(s); loadAllData(); }} />}
          
          {/* Fallback au cas où isSuperAdmin serait faux mais currentView === 'super-admin' */}
          {currentView === 'super-admin' && !isSuperAdmin && (
            <div className="flex items-center justify-center h-full">
               <div className="text-center">
                  <h3 className="text-lg font-black text-slate-800">Chargement de votre atelier...</h3>
                  <p className="text-slate-500 text-sm">Veuillez patienter.</p>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
