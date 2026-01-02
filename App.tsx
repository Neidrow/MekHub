
import React, { useState, useEffect } from 'react';
import { ViewState, Client, Vehicule, RendezVous, Facture, Devis, StockItem, Mecanicien, GarageSettings } from './types.ts';
import { ICONS } from './constants.tsx';
import { api, supabase } from './services/api.ts';
import Auth from './components/Auth.tsx';
import Dashboard from './components/Dashboard.tsx';
import Appointments from './components/Appointments.tsx';
import Customers from './components/Customers.tsx';
import Vehicles from './components/Vehicles.tsx';
import Quotes from './components/Quotes.tsx';
import Invoices from './components/Invoices.tsx';
import Inventory from './components/Inventory.tsx';
import AIAssistant from './components/AIAssistant.tsx';
import Settings from './components/Settings.tsx';
import Mechanics from './components/Mechanics.tsx';
import SuperAdmin from './components/SuperAdmin.tsx';
import WelcomeOverlay from './components/WelcomeOverlay.tsx';
import GoogleCalendarModal from './components/GoogleCalendarModal.tsx';

interface NavItemProps {
  view: ViewState;
  label: string;
  icon: React.FC;
  color?: string;
  isPremium?: boolean;
  currentView: ViewState;
  onClick: (view: ViewState) => void;
}

const NavItem: React.FC<NavItemProps> = ({ view, label, icon: Icon, color = 'blue', isPremium = false, currentView, onClick }) => {
  const isActive = currentView === view;
  const baseClasses = "flex items-center justify-between px-4 py-3 rounded-2xl transition-all w-full group";
  
  const getActiveClasses = () => {
    if (!isActive) return "text-slate-500 hover:bg-slate-100 hover:text-slate-800";
    if (color === 'purple') return "bg-purple-600 text-white shadow-xl shadow-purple-500/20";
    return "bg-blue-600 text-white shadow-xl shadow-blue-500/20";
  };

  return (
    <button onClick={() => onClick(view)} className={`${baseClasses} ${getActiveClasses()}`}>
      <div className="flex items-center gap-3">
        <div className={`transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}`}>
          <Icon />
        </div>
        <span className="font-bold text-sm tracking-tight">{label}</span>
      </div>
      {isPremium && (
        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600'}`}>
          PRO
        </span>
      )}
    </button>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [rendezVous, setRendezVous] = useState<RendezVous[]>([]);
  const [mecaniciens, setMecaniciens] = useState<Mecanicien[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [settings, setSettings] = useState<GarageSettings | null>(null);

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

  const handleSession = async (sess: any) => {
    setLoading(true);
    if (sess) {
      const email = sess.user?.email;
      const metadata = sess.user?.user_metadata || {};
      
      if (metadata.role !== 'super_admin') {
        const status = await api.checkStatus(email);
        if (status === 'Suspendu') {
          setIsSuspended(true);
          setSession(null);
          await api.logout();
          setLoading(false);
          return;
        }
      }
      
      setSession(sess);
      setIsSuspended(false);
      const needsChange = metadata.needs_password_change;
      
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
        await loadAllData();
      }
    } else {
      resetData();
    }
  };

  const resetData = () => {
    setSession(null);
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
    setShowWelcome(false);
    setShowGooglePrompt(false);
    setIsSuspended(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await api.logout();
      resetData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
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

      // Si le paramètre google_calendar_enabled n'a jamais été défini (onboarding)
      if (sett && sett.google_calendar_enabled === undefined) {
        setShowGooglePrompt(true);
      }
    } catch (err) {
      console.error(err);
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
      setShowWelcome(true);
      await loadAllData();
    } catch (err: any) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      // Déclenche l'autorisation OAuth réelle
      await api.requestGoogleAccess();
      // Sauvegarde le choix dans les paramètres Supabase
      await api.saveSettings({ google_calendar_enabled: true });
      setShowGooglePrompt(false);
      // Recharger les données pour s'assurer que tout est à jour
      await loadAllData();
    } catch (err: any) {
      console.error("Échec connexion Google:", err);
      alert(err.message || "La connexion Google a échoué.");
    }
  };

  const handleGoogleSkip = async () => {
    try {
      // On enregistre que l'utilisateur a refusé pour ne plus lui demander automatiquement
      await api.saveSettings({ google_calendar_enabled: false });
      setShowGooglePrompt(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-24 h-24 bg-rose-600 text-white rounded-[2rem] flex items-center justify-center shadow-2xl mb-8">
           <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h1 className="text-4xl font-black text-rose-900 mb-4 tracking-tighter">Accès Révoqué</h1>
        <button onClick={() => window.location.reload()} className="px-10 py-4 bg-rose-600 text-white font-black rounded-2xl">Retour</button>
      </div>
    );
  }

  if (loading && !session) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) return <Auth onLogin={(sess) => handleSession(sess)} />;

  const userMetadata = session.user?.user_metadata || {};
  const garageDisplayName = settings?.nom || userMetadata.garage_name || "Nouveau Garage";
  const isSuperAdmin = userMetadata.role === 'super_admin';
  const userRole = userMetadata.role || 'user_basic';

  const navigateTo = (view: ViewState) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-[#1e293b]">
      {showWelcome && (
        <WelcomeOverlay 
          garageName={garageDisplayName} 
          onComplete={() => setShowWelcome(false)} 
        />
      )}

      {showGooglePrompt && !showWelcome && (
        <GoogleCalendarModal 
          onConnect={handleGoogleConnect}
          onSkip={handleGoogleSkip}
        />
      )}

      {mustChangePassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10">
            <h2 className="text-2xl font-black text-slate-800 text-center mb-6">Initialisation du compte</h2>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
               <input required type="password" placeholder="Nouveau mot de passe" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={newPass} onChange={e => setNewPass(e.target.value)} />
               <input required type="password" placeholder="Confirmer" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
               {passError && <p className="text-rose-500 text-xs font-bold text-center">{passError}</p>}
               <button disabled={passLoading} type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl">Activer mon compte</button>
            </form>
          </div>
        </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      <aside className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-100 flex flex-col z-40 transition-transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl mb-4">{garageDisplayName.charAt(0)}</div>
          <h1 className="text-lg font-black text-slate-800 truncate w-full">{garageDisplayName}</h1>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {isSuperAdmin && <NavItem view="super-admin" label="Master SaaS" icon={ICONS.Dashboard} color="purple" currentView={currentView} onClick={navigateTo} />}
          <NavItem view="dashboard" label="Dashboard" icon={ICONS.Dashboard} currentView={currentView} onClick={navigateTo} />
          <NavItem view="appointments" label="Rendez-vous" icon={ICONS.Appointments} currentView={currentView} onClick={navigateTo} />
          <NavItem view="customers" label="Clients" icon={ICONS.Customers} currentView={currentView} onClick={navigateTo} />
          <NavItem view="vehicles" label="Véhicules" icon={ICONS.Vehicles} currentView={currentView} onClick={navigateTo} />
          <NavItem view="mechanics" label="Équipe" icon={ICONS.Mechanics} currentView={currentView} onClick={navigateTo} />
          <NavItem view="inventory" label="Stocks" icon={ICONS.Inventory} isPremium={true} currentView={currentView} onClick={navigateTo} />
          <NavItem view="quotes" label="Devis" icon={ICONS.Quotes} currentView={currentView} onClick={navigateTo} />
          <NavItem view="invoices" label="Factures" icon={ICONS.Invoices} currentView={currentView} onClick={navigateTo} />
          <NavItem view="ai-assistant" label="Assistant AI" icon={ICONS.AI} currentView={currentView} onClick={navigateTo} />
          <NavItem view="settings" label="Paramètres" icon={ICONS.Settings} currentView={currentView} onClick={navigateTo} />
        </nav>
        <div className="p-4 border-t">
          <button onClick={handleLogout} className="w-full py-4 text-rose-500 font-bold hover:bg-rose-50 rounded-2xl transition-all flex items-center justify-center gap-2">Déconnexion</button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 flex flex-col min-w-0">
        <header className="h-20 bg-white/70 backdrop-blur-xl border-b flex items-center justify-between px-6 sticky top-0 z-20">
          <button className="lg:hidden p-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="text-sm font-bold text-slate-700">{session.user?.email}</span>
        </header>

        <div className="p-6 lg:p-10 flex-1 overflow-y-auto">
          {currentView === 'super-admin' && isSuperAdmin && <SuperAdmin />}
          {currentView === 'dashboard' && (
            <Dashboard 
              customers={clients} 
              vehicles={vehicules} 
              mecaniciens={mecaniciens}
              appointments={rendezVous} 
              onAddAppointment={async (app) => { await api.postData('rendez_vous', app); loadAllData(); }} 
              onNavigate={navigateTo} 
            />
          )}
          {currentView === 'customers' && (
            <Customers 
              customers={clients} 
              onAddCustomer={async (c) => { await api.postData('clients', c); loadAllData(); }}
              onUpdateCustomer={async (id, updates) => { await api.updateData('clients', id, updates); loadAllData(); }}
            />
          )}
          {currentView === 'inventory' && <Inventory inventory={stock} userRole={userRole} onAddItem={async (item) => { await api.postData('stock', item); loadAllData(); }} onDeleteItem={async (id) => { await api.deleteData('stock', id); loadAllData(); }} />}
          {currentView === 'appointments' && (
            <Appointments 
              appointments={rendezVous} 
              customers={clients} 
              vehicles={vehicules} 
              mecaniciens={mecaniciens}
              onAddAppointment={async (app) => { await api.postData('rendez_vous', app); loadAllData(); }}
              onUpdateStatus={async (id, status) => { await api.updateData('rendez_vous', id, { statut: status }); loadAllData(); }}
              onUpdateAppointment={async (id, updates) => { await api.updateData('rendez_vous', id, updates); loadAllData(); }}
              onDelete={async (id) => { await api.deleteData('rendez_vous', id); loadAllData(); }}
              onNavigate={navigateTo}
            />
          )}
          {currentView === 'vehicles' && (
            <Vehicles 
              vehicles={vehicules} 
              customers={clients} 
              onAdd={async (v) => { await api.postData('vehicules', v); loadAllData(); }}
              onUpdate={async (id, updates) => { await api.updateData('vehicules', id, updates); loadAllData(); }}
              onDelete={async (id) => { await api.deleteData('vehicules', id); loadAllData(); }}
            />
          )}
          {currentView === 'mechanics' && (
            <Mechanics 
              mechanics={mecaniciens} 
              onAdd={async (m) => { await api.postData('mecaniciens', m); loadAllData(); }}
              onUpdate={async (id, updates) => { await api.updateData('mecaniciens', id, updates); loadAllData(); }}
              onDelete={async (id) => { await api.deleteData('mecaniciens', id); loadAllData(); }}
            />
          )}
          {currentView === 'quotes' && <Quotes devis={devis} />}
          {currentView === 'invoices' && <Invoices invoices={factures} />}
          {currentView === 'ai-assistant' && <AIAssistant />}
          {currentView === 'settings' && <Settings initialSettings={settings} onSave={async (s) => { await api.saveSettings(s); loadAllData(); }} />}
        </div>
      </main>
    </div>
  );
};

export default App;
