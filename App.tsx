
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Client, Vehicule, RendezVous, Facture, Devis, StockItem, Mecanicien, GarageSettings, Notification, SystemMaintenance } from './types.ts';
import { ICONS } from './constants.tsx';
import { api, supabase } from './services/api.ts';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext.tsx';
import Auth from './components/Auth.tsx';
import Dashboard from './components/Dashboard.tsx';
import Appointments from './components/Appointments.tsx';
import Customers from './components/Customers.tsx';
import Vehicles from './components/Vehicles.tsx';
import Quotes from './components/Quotes.tsx';
import Invoices from './components/Invoices.tsx';
import Inventory from './components/Inventory.tsx';
import Statistics from './components/Statistics.tsx';
import AIAssistant from './components/AIAssistant.tsx';
import Settings from './components/Settings.tsx';
import Mechanics from './components/Mechanics.tsx';
import SuperAdmin from './components/SuperAdmin.tsx';
import PublicQuoteView from './components/PublicQuoteView.tsx';
import Tutorial from './components/Tutorial.tsx';
import HelpModal from './components/HelpModal.tsx';
import PrivacyPolicy from './components/PrivacyPolicy.tsx';
import TermsOfService from './components/TermsOfService.tsx';

interface NavItemProps {
  view: ViewState;
  label: string;
  icon: string;
  isPremium?: boolean;
  alertCount?: number;
  currentView: ViewState;
  onClick: (view: ViewState) => void;
  isBeta?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ view, label, icon, isPremium = false, alertCount, currentView, onClick }) => {
  const isActive = currentView === view;
  
  return (
    <button 
      onClick={() => onClick(view)} 
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all w-full group relative ${
        isActive 
          ? 'bg-gradient-to-r from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/10 shadow-sm' 
          : 'text-text-muted-light dark:text-text-muted-dark hover:bg-white/50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      <div className={`absolute inset-0 bg-blue-500/10 opacity-0 ${isActive ? 'opacity-100' : 'group-hover:opacity-100'} transition-opacity rounded-2xl`}></div>
      <span className="material-symbols-outlined relative z-10 transition-colors">{icon}</span>
      <span className="text-sm relative z-10">{label}</span>
      {isPremium && (
        <span className={`ml-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-purple-500/20 relative z-10`}>
          BÊTA
        </span>
      )}
      {alertCount !== undefined && alertCount > 0 && (
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-pulse relative z-10">
          {alertCount > 9 ? '9+' : alertCount}
        </span>
      )}
    </button>
  );
};

const GarageProApp: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  
  // ROUTING MANUEL POUR LES PAGES STATIQUES
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  
  if (path === '/privacy') {
    return <PrivacyPolicy />;
  }
  
  if (path === '/terms') {
    return <TermsOfService />;
  }

  const [session, setSession] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<SystemMaintenance>({ enabled: false, message: '' });
  
  const urlParams = new URLSearchParams(window.location.search);
  const publicQuoteId = urlParams.get('id');
  const isPublicView = urlParams.get('view') === 'public_quote' && publicQuoteId;

  const [currentView, setCurrentView] = useState<ViewState>(() => {
    const savedView = localStorage.getItem('garagepro_current_view');
    return (savedView as ViewState) || 'dashboard';
  });

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('garagepro_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('garagepro_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('garagepro_theme', 'light');
    }
  }, [darkMode]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info' | 'warning', title: string, message: string } | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [rendezVous, setRendezVous] = useState<RendezVous[]>([]);
  const [mecaniciens, setMecaniciens] = useState<Mecanicien[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [settings, setSettings] = useState<GarageSettings | null>(null);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  // Alertes Menu
  const [invoiceAlerts, setInvoiceAlerts] = useState(0);
  const [quoteAlerts, setQuoteAlerts] = useState(0);

  const notifRef = useRef<HTMLDivElement>(null);

  const handleNotify = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSession = async (sess: any) => {
    setSession(sess);
    if (!sess) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const suspended = await api.checkSuspensionStatus(sess.user.id);
      const isSuperAdmin = sess.user.user_metadata?.role === 'super_admin';

      if (suspended && !isSuperAdmin) {
        setIsSuspended(true);
        setLoading(false);
        return;
      }
      setIsSuspended(false);

      const [sett, c, v, r, m, s, d, f, n] = await Promise.all([
        api.getSettings(),
        api.fetchData<Client>('clients'),
        api.fetchData<Vehicule>('vehicules'),
        api.fetchData<RendezVous>('rendez_vous'),
        api.fetchData<Mecanicien>('mecaniciens'),
        api.fetchData<StockItem>('stock'),
        api.fetchData<Devis>('devis'),
        api.fetchData<Facture>('factures'),
        api.fetchNotifications()
      ]);

      setSettings(sett);
      setClients(c);
      setVehicules(v);
      setRendezVous(r);
      setMecaniciens(m);
      setStock(s);
      setDevis(d);
      setFactures(f);
      setNotifications(n);

      if (sess.user.user_metadata?.needs_password_change) {
        setMustChangePassword(true);
      }
      
      if (!sett?.google_prompt_dismissed && !sett?.google_calendar_enabled) {
        setShowGooglePrompt(true);
      }
      
      // Afficher le tutoriel à la première connexion
      if (!sett?.tutorial_completed) {
        setShowTutorial(true);
      }

    } catch (err) {
      console.error("Error initializing session data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calcul des alertes (Factures en retard / Devis expirés)
  useEffect(() => {
    if (!factures && !devis) return;

    const calculateDelay = (dateStr: string) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - targetDate.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    // Factures en retard (> 7 jours comme dans Invoices.tsx)
    const overdueInvoices = factures.filter(f => 
      f.statut === 'non_payee' && calculateDelay(f.date_facture) >= 7
    ).length;
    setInvoiceAlerts(overdueInvoices);

    // Devis expirés (En attente + date validité dépassée)
    const validityDays = settings?.validite_devis || 30;
    const expiredQuotes = devis.filter(d => {
      if (d.statut !== 'en_attente') return false;
      const today = new Date();
      today.setHours(0,0,0,0);
      const devisDate = new Date(d.date_devis);
      devisDate.setHours(0,0,0,0);
      const expirationDate = new Date(devisDate);
      expirationDate.setDate(devisDate.getDate() + validityDays);
      return today > expirationDate;
    }).length;
    setQuoteAlerts(expiredQuotes);

  }, [factures, devis, settings]);

  useEffect(() => {
    const checkSys = async () => {
       try {
         const m = await api.getMaintenanceStatus();
         setMaintenance(m);
       } catch (e) {
         console.warn("Maintenance check failed", e);
       }
    };
    checkSys();

    if (!isPublicView) {
        supabase.auth.getSession().then(({ data: { session: sess } }) => {
          handleSession(sess);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
          handleSession(sess);
        });
        
        return () => subscription.unsubscribe();
    } else {
        setLoading(false);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
    localStorage.setItem('garagepro_current_view', view);
    setIsSidebarOpen(false);
  };

  const handleMarkNotifRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const onMarkNotifRead = (id: string) => {
    handleMarkNotifRead(id);
  };

  const userRole = session?.user?.user_metadata?.role || 'user';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isNotifOpen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark dark:bg-background-light">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth onLogin={handleSession} />;
  }

  if (isSuspended && userRole !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-6 text-white font-sans text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-600/20 rounded-full blur-[120px]"></div>
        </div>
        <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl relative z-10 animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-rose-500/20 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-rose-500/20 shadow-inner">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           </div>
           <h1 className="text-3xl font-black mb-4 tracking-tight">Accès Suspendu</h1>
           <p className="text-slate-400 font-medium leading-relaxed mb-10">Votre compte GaragePro a été suspendu par l'administration. Veuillez contacter le support pour régulariser votre situation.</p>
           <button onClick={() => api.logout()} className="w-full py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-100 transition-all uppercase text-xs tracking-widest shadow-xl active:scale-95">Se déconnecter</button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard customers={clients} vehicles={vehicules} mecaniciens={mecaniciens} appointments={rendezVous} invoices={factures} notifications={notifications} onMarkAsRead={handleMarkNotifRead} onAddAppointment={async (app) => { try { const r = await api.postData<RendezVous>('rendez_vous', app); setRendezVous([r, ...rendezVous]); } catch (e: any) { if(e.message && e.message.includes('Token Google')) { handleNotify('error', 'Erreur Google', e.message); } else { throw e; } } }} onNavigate={handleNavigate} settings={settings} />;
      case 'appointments': return <Appointments appointments={rendezVous} customers={clients} vehicles={vehicules} mecaniciens={mecaniciens} onAddAppointment={async (app) => { try { const r = await api.postData<RendezVous>('rendez_vous', app); setRendezVous([r, ...rendezVous]); } catch (e: any) { if(e.message && e.message.includes('Token Google')) { handleNotify('error', 'Erreur Google', e.message); } else { throw e; } } }} onUpdateStatus={async (id, s) => { await api.updateData('rendez_vous', id, { statut: s }); setRendezVous(rendezVous.map(r => r.id === id ? { ...r, statut: s } : r)); }} onUpdateAppointment={async (id, up) => { await api.updateData('rendez_vous', id, up); setRendezVous(rendezVous.map(r => r.id === id ? { ...r, ...up } : r)); }} onDelete={async (id) => { await api.deleteData('rendez_vous', id); setRendezVous(rendezVous.filter(r => r.id !== id)); }} onNavigate={handleNavigate} />;
      case 'customers': return <Customers customers={clients} onAddCustomer={async (c) => { const r = await api.postData<Client>('clients', c); setClients([r, ...clients]); }} onUpdateCustomer={async (id, up) => { await api.updateData('clients', id, up); setClients(clients.map(c => c.id === id ? { ...c, ...up } : c)); }} onDeleteCustomer={async (id) => { await api.deleteData('clients', id); setClients(clients.filter(c => c.id !== id)); }} />;
      case 'vehicles': return <Vehicles vehicles={vehicules} customers={clients} appointments={rendezVous} invoices={factures} onAdd={async (v) => { const r = await api.postData<Vehicule>('vehicules', v); setVehicules([r, ...vehicules]); }} onUpdate={async (id, up) => { await api.updateData('vehicules', id, up); setVehicules(vehicules.map(v => v.id === id ? { ...v, ...up } : v)); }} onDelete={async (id) => { await api.deleteData('vehicules', id); setVehicules(vehicules.filter(v => v.id !== id)); }} />;
      case 'mechanics': return <Mechanics mechanics={mecaniciens} onAdd={async (m) => { const r = await api.postData<Mecanicien>('mecaniciens', m); setMecaniciens([r, ...mecaniciens]); }} onUpdate={async (id, up) => { await api.updateData('mecaniciens', id, up); setMecaniciens(mecaniciens.map(m => m.id === id ? { ...m, ...up } : m)); }} onDelete={async (id) => { await api.deleteData('mecaniciens', id); setMecaniciens(mecaniciens.filter(m => m.id !== id)); }} />;
      case 'quotes': return <Quotes devis={devis} customers={clients} vehicles={vehicules} settings={settings} userRole={userRole} invoices={factures} onAdd={async (d) => { const r = await api.postData<Devis>('devis', d); setDevis([r, ...devis]); return r; }} onUpdate={async (id, up) => { await api.updateData('devis', id, up); setDevis(devis.map(d => d.id === id ? { ...d, ...up } : d)); }} onDelete={async (id) => { await api.deleteData('devis', id); setDevis(devis.filter(d => d.id !== id)); }} onAddInvoice={async (f) => { const r = await api.postData<Facture>('factures', f); setFactures([r, ...factures]); }} onNavigate={handleNavigate} onNotify={handleNotify} />;
      case 'invoices': return <Invoices invoices={factures} customers={clients} vehicles={vehicules} settings={settings} onAdd={async (f) => { const r = await api.postData<Facture>('factures', f); setFactures([r, ...factures]); }} onUpdate={async (id, up) => { await api.updateData('factures', id, up); setFactures(factures.map(f => f.id === id ? { ...f, ...up } : f)); }} onDelete={async (id) => { await api.deleteData('factures', id); setFactures(factures.filter(f => f.id !== id)); }} onNotify={handleNotify} />;
      case 'inventory': return <Inventory inventory={stock} userRole={userRole} onAddItem={async (i) => { const r = await api.postData<StockItem>('stock', i); setStock([r, ...stock]); return r; }} onUpdateItem={async (id, up) => { await api.updateData('stock', id, up); setStock(stock.map(s => s.id === id ? { ...s, ...up } : s)); }} onDeleteItem={async (id) => { await api.deleteData('stock', id); setStock(stock.filter(s => s.id !== id)); }} />;
      case 'statistics': return <Statistics invoices={factures} appointments={rendezVous} customers={clients} />;
      case 'ai-assistant': return <AIAssistant userId={session.user.id} userRole={userRole} />;
      case 'settings': return <Settings initialSettings={settings} onSave={async (s) => { const r = await api.saveSettings(s); setSettings(r); }} onRefresh={async () => { const r = await api.getSettings(); setSettings(r); }} />;
      case 'super-admin-overview': case 'super-admin-garages': case 'super-admin-logs': case 'super-admin-communication': return <SuperAdmin currentTab={currentView} onNotify={handleNotify} />;
      default: return null;
    }
  };

  return (
    <div className={`${darkMode ? 'dark' : ''} mesh-bg text-text-main-light dark:text-text-main-dark h-screen overflow-hidden flex font-body transition-colors duration-300`}>
      {/* Sidebar */}
      <aside className="w-72 bg-surface-light/80 dark:bg-surface-dark/60 backdrop-blur-xl border-r border-white/20 dark:border-white/5 flex flex-col h-full z-20 shadow-2xl shadow-black/20">
        {/* Logo Section */}
        <div className="h-24 flex items-center px-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="material-symbols-outlined text-white text-xl">build_circle</span>
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">{settings?.nom || 'MekHub'}</h1>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark font-medium">Gestion Garage</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-2 space-y-1.5 overflow-y-auto flex-1">
          <NavItem view="dashboard" label={t('nav.dashboard')} icon="dashboard" currentView={currentView} onClick={handleNavigate} />
          <NavItem view="appointments" label={t('nav.appointments')} icon="calendar_month" currentView={currentView} onClick={handleNavigate} />
          <NavItem view="customers" label={t('nav.customers')} icon="people" currentView={currentView} onClick={handleNavigate} />
          <NavItem view="vehicles" label={t('nav.vehicles')} icon="directions_car" currentView={currentView} onClick={handleNavigate} />
          <NavItem view="mechanics" label={t('nav.mechanics')} icon="badge" currentView={currentView} onClick={handleNavigate} />

          {/* Finance Section */}
          <div className="pt-6 pb-2 px-4">
            <p className="text-[10px] font-bold text-text-muted-light dark:text-gray-500 uppercase tracking-widest">Finance</p>
          </div>
          <NavItem view="quotes" label={t('nav.quotes')} icon="request_quote" currentView={currentView} onClick={handleNavigate} alertCount={quoteAlerts} />
          <NavItem view="invoices" label={t('nav.invoices')} icon="receipt_long" currentView={currentView} onClick={handleNavigate} alertCount={invoiceAlerts} />

          {/* Tools Section */}
          <div className="pt-6 pb-2 px-4">
            <p className="text-[10px] font-bold text-text-muted-light dark:text-gray-500 uppercase tracking-widest">Outils</p>
          </div>
          <NavItem view="inventory" label={t('nav.inventory')} icon="inventory_2" isPremium={true} currentView={currentView} onClick={handleNavigate} />
          <NavItem view="ai-assistant" label={t('nav.ai_assistant')} icon="smart_toy" isPremium={true} currentView={currentView} onClick={handleNavigate} />
          
          {/* Admin Section */}
          {userRole === 'super_admin' && (
            <>
              <div className="pt-6 pb-2 px-4">
                <p className="text-[10px] font-bold text-text-muted-light dark:text-gray-500 uppercase tracking-widest">Admin</p>
              </div>
              <NavItem view="super-admin-overview" label={t('nav.admin_overview')} icon="admin_panel_settings" currentView={currentView} onClick={handleNavigate} />
              <NavItem view="super-admin-garages" label={t('nav.admin_garages')} icon="business" currentView={currentView} onClick={handleNavigate} />
              <NavItem view="super-admin-logs" label={t('nav.admin_logs')} icon="history" currentView={currentView} onClick={handleNavigate} />
              <NavItem view="super-admin-communication" label={t('nav.admin_comm')} icon="mail" currentView={currentView} onClick={handleNavigate} />
            </>
          )}
        </nav>

        {/* User Profile Section */}
        <div className="mt-auto px-4 pb-4">
          <div className="flex items-center justify-between p-3 mb-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 shrink-0">
                <img 
                  alt="Profil Utilisateur" 
                  className="w-full h-full object-cover rounded-full shadow-md" 
                  src={session?.user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuBVVVWdL1s4cbCLs-75COsjJGiIVYbi43KHS7oc2406m6MBJVihJLabOmogZhjDRuvxQec5SIZqLBnuVFB70a-6TUqwM7f895iw73kcoHEvJ2jOByZxBSFYWWjFtMiOWYBllC0PrsY_obf8-NH0WxjJAyUeOxLFJCTo1QNz-DZNi3i-wRm7tKHMzsGCWlY8qkYPNUbJ_eIEaBMw42kXcuqlezhKo08UqiaghfJoHaLZQrcEg-UI0tkiAPmWLrF-QMksq6wSQUSGwKHu"} 
                />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'Utilisateur'}</p>
                <p className="text-xs text-blue-500 dark:text-blue-400 font-medium truncate">{settings?.nom || 'Garage Auto Pro'}</p>
              </div>
            </div>
            <button onClick={() => handleNavigate('settings')} className="text-text-muted-light dark:text-text-muted-dark hover:text-white transition-colors">
              <span className="material-symbols-outlined text-xl">settings</span>
            </button>
          </div>
          <button 
            onClick={() => api.logout()} 
            className="flex items-center gap-3 w-full p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-colors group"
          >
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">logout</span>
            <span className="text-sm font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none z-0"></div>
        
        {/* Header */}
        <header className="h-24 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="absolute inset-0 bg-background-light/70 dark:bg-background-dark/70 backdrop-blur-xl border-b border-white/10 shadow-sm"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight drop-shadow-sm">
              {currentView === 'dashboard' && t('nav.dashboard')}
              {currentView === 'appointments' && t('nav.appointments')}
              {currentView === 'customers' && t('nav.customers')}
              {currentView === 'vehicles' && t('nav.vehicles')}
              {currentView === 'mechanics' && t('nav.mechanics')}
              {currentView === 'quotes' && t('nav.quotes')}
              {currentView === 'invoices' && t('nav.invoices')}
              {currentView === 'inventory' && t('nav.inventory')}
              {currentView === 'statistics' && t('nav.statistics')}
              {currentView === 'ai-assistant' && t('nav.ai_assistant')}
              {currentView === 'settings' && t('nav.settings')}
              {currentView?.startsWith('super-admin') && t('nav.master_admin')}
            </h2>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark font-medium mt-1">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <button id="app-notifications" onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-text-muted-light dark:text-text-muted-dark border border-white/5 transition-all">
              <span className="material-symbols-outlined">notifications</span>
              {notifications.length > 0 && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background-dark"></span>}
            </button>
            <button id="app-theme-toggle" onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-text-muted-light dark:text-text-muted-dark hover:text-yellow-400 dark:hover:text-yellow-400 border border-white/5 transition-all">
              <span className="material-symbols-outlined dark:hidden">dark_mode</span>
              <span className="material-symbols-outlined hidden dark:inline">light_mode</span>
            </button>
            <button id="app-help" onClick={() => setShowHelpModal(true)} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-text-muted-light dark:text-text-muted-dark border border-white/5 transition-all">
              <span className="material-symbols-outlined">help</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto relative z-10">
          {renderContent()}
        </div>

        {/* Notifications Dropdown */}
        <div ref={notifRef} className="absolute top-24 right-8 z-50">
          {isNotifOpen && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-96 max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                  <p className="text-sm">{t('common.no_notifications')}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {notifications.map(notif => (
                    <div key={notif.id} onClick={() => onMarkNotifRead(notif.id)} className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${!notif.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                      <p className="font-medium text-slate-900 dark:text-white">{notif.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{notif.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Help and Tutorial Modals */}
        {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} onRestartTutorial={() => { setShowHelpModal(false); setShowTutorial(true); }} currentViewName={currentView} />}
        {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <GarageProApp />
    </LanguageProvider>
  );
}
