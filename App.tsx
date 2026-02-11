
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
  icon: React.FC;
  color?: string;
  isPremium?: boolean;
  alertCount?: number;
  currentView: ViewState;
  onClick: (view: ViewState) => void;
}

const NavItem: React.FC<NavItemProps> = ({ view, label, icon: Icon, color = 'blue', isPremium = false, alertCount, currentView, onClick }) => {
  const isActive = currentView === view;
  const baseClasses = "flex items-center justify-between px-4 py-3 rounded-2xl transition-all w-full group relative font-medium";
  
  const getActiveClasses = () => {
    if (!isActive) return "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200";
    if (color === 'purple') return "bg-purple-600 text-white shadow-lg shadow-purple-900/20";
    if (color === 'indigo') return "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20";
    if (color === 'rose') return "bg-rose-600 text-white shadow-lg shadow-rose-900/20";
    if (color === 'amber') return "bg-amber-50 text-white shadow-lg shadow-amber-900/20";
    return "bg-blue-600 text-white shadow-lg shadow-blue-900/20";
  };

  return (
    <button onClick={() => onClick(view)} className={`${baseClasses} ${getActiveClasses()}`}>
      <div className="flex items-center gap-3">
        <div className={`transition-colors ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
          <Icon />
        </div>
        <span className="text-sm tracking-tight">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {isPremium && (
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}>
            PRO
          </span>
        )}
        {alertCount !== undefined && alertCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {alertCount > 9 ? '9+' : alertCount}
          </span>
        )}
      </div>
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

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPublicView]);

  useEffect(() => {
    if (session && !loading && !mustChangePassword && !showWelcome && !isPublicView && !isSuspended) {
      const isTutorialDismissed = localStorage.getItem('gp_tutorial_global_dismissed') === 'true';
      
      if (!isTutorialDismissed) {
        const tutorialsSeen = JSON.parse(localStorage.getItem('gp_tutorials_seen') || '[]');
        if (!tutorialsSeen.includes(currentView)) {
          setShowTutorial(true);
        } else {
          setShowTutorial(false);
        }
      }
    }
  }, [currentView, session, loading, mustChangePassword, showWelcome, isSuspended]);

  useEffect(() => {
    if (!session || isSuspended || rendezVous.length === 0) return;

    const checkAndAutoUpdateStatus = async () => {
      const now = new Date();
      let hasUpdates = false;

      const updates = rendezVous.map(async (rdv) => {
        if (rdv.statut === 'annule' || rdv.statut === 'termine') return rdv;

        const [year, month, day] = rdv.date.split('-').map(Number);
        const [hours, minutes] = rdv.heure.split(':').map(Number);
        const startDateTime = new Date(year, month - 1, day, hours, minutes, 0);
        
        let durationMs = 60 * 60 * 1000;
        if (rdv.duree) {
          const val = parseInt(rdv.duree);
          if (rdv.duree.includes('m')) durationMs = val * 60 * 1000;
          else if (rdv.duree.includes('h')) durationMs = val * 60 * 60 * 1000;
        }

        const endDateTime = new Date(startDateTime.getTime() + durationMs);
        let newStatus: RendezVous['statut'] | null = null;

        if (now > endDateTime && rdv.statut === 'en_cours') {
          newStatus = 'termine';
        } else if (now > startDateTime && now < endDateTime && rdv.statut === 'en_attente') {
          newStatus = 'en_cours';
        }

        if (newStatus) {
          hasUpdates = true;
          await api.updateData('rendez_vous', rdv.id, { statut: newStatus });
          return { ...rdv, statut: newStatus };
        }
        return rdv;
      });

      if (hasUpdates) {
        const results = await Promise.all(updates);
        setRendezVous(results);
      }
    };

    const interval = setInterval(checkAndAutoUpdateStatus, 60000);
    return () => clearInterval(interval);
  }, [session, isSuspended, rendezVous]);

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
    localStorage.setItem('garagepro_current_view', view);
    setIsSidebarOpen(false);
  };

  const handleMarkNotifRead = async (id: string) => {
    await api.markNotificationAsRead(id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleDeleteNotif = async (id: string) => {
    await api.deleteNotification(id);
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const handleMarkAllNotifsRead = async () => {
    await api.markAllNotificationsAsRead();
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getNotifStyles = (type: string, read: boolean) => {
    if (read) return 'opacity-60 bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800';
    switch (type) {
      case 'success': return 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30';
      case 'error': return 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30';
      case 'warning': return 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30';
      default: return 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30';
    }
  };

  const getNotifTitleColor = (type: string, read: boolean) => {
    if (read) return 'text-slate-600 dark:text-slate-400';
    switch (type) {
      case 'success': return 'text-emerald-800 dark:text-emerald-300';
      case 'error': return 'text-rose-800 dark:text-rose-300';
      case 'warning': return 'text-amber-800 dark:text-amber-300';
      default: return 'text-blue-900 dark:text-blue-200';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const userRole: any = session?.user?.user_metadata?.role || 'user_basic';

  if (isPublicView) {
    return <PublicQuoteView quoteId={publicQuoteId!} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
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
      case 'dashboard': return <Dashboard customers={clients} vehicles={vehicules} mecaniciens={mecaniciens} appointments={rendezVous} invoices={factures} notifications={notifications} onMarkAsRead={handleMarkNotifRead} onAddAppointment={async (app) => { try { const r = await api.postData<RendezVous>('rendez_vous', app); setRendezVous([r, ...rendezVous]); } catch (e: any) { if(e.message && e.message.includes('Token Google')) { handleNotify('error', 'Erreur Google', e.message); } else { throw e; } } }} onNavigate={handleNavigate} />;
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
    <div className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans transition-colors`}>
      <aside id="app-sidebar" className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
               <ICONS.Dashboard />
            </div>
            <h1 className="text-xl font-black tracking-tight dark:text-white truncate" title={settings?.nom || "GaragePro"}>
              {settings?.nom || "GaragePro"}
            </h1>
          </div>
          <nav className="space-y-1.5 flex-1 overflow-y-auto scrollbar-hide">
            <NavItem view="dashboard" label={t('nav.dashboard')} icon={ICONS.Dashboard} currentView={currentView} onClick={handleNavigate} />
            <NavItem view="appointments" label={t('nav.appointments')} icon={ICONS.Appointments} currentView={currentView} onClick={handleNavigate} />
            <NavItem view="customers" label={t('nav.customers')} icon={ICONS.Customers} currentView={currentView} onClick={handleNavigate} />
            <NavItem view="vehicles" label={t('nav.vehicles')} icon={ICONS.Vehicles} currentView={currentView} onClick={handleNavigate} />
            <NavItem view="mechanics" label={t('nav.mechanics')} icon={ICONS.Mechanics} currentView={currentView} onClick={handleNavigate} />
            <NavItem view="quotes" label={t('nav.quotes')} icon={ICONS.Quotes} currentView={currentView} onClick={handleNavigate} alertCount={quoteAlerts} />
            <NavItem view="invoices" label={t('nav.invoices')} icon={ICONS.Invoices} currentView={currentView} onClick={handleNavigate} alertCount={invoiceAlerts} />
            <NavItem view="inventory" label={t('nav.inventory')} icon={ICONS.Inventory} isPremium={true} currentView={currentView} onClick={handleNavigate} />
            <NavItem view="statistics" label={t('nav.statistics')} icon={ICONS.Stats} currentView={currentView} onClick={handleNavigate} />
            <NavItem view="ai-assistant" label={t('nav.ai_assistant')} icon={ICONS.AI} color="indigo" isPremium={true} currentView={currentView} onClick={handleNavigate} />
            {userRole === 'super_admin' && (
              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('nav.master_admin')}</p>
                <NavItem view="super-admin-overview" label={t('nav.admin_overview')} icon={ICONS.Dashboard} color="rose" currentView={currentView} onClick={handleNavigate} />
                <NavItem view="super-admin-garages" label={t('nav.admin_garages')} icon={ICONS.AdminGarages} color="rose" currentView={currentView} onClick={handleNavigate} />
                <NavItem view="super-admin-logs" label={t('nav.admin_logs')} icon={ICONS.AdminLogs} color="rose" currentView={currentView} onClick={handleNavigate} />
                <NavItem view="super-admin-communication" label={t('nav.admin_comm')} icon={ICONS.AdminComm} color="rose" currentView={currentView} onClick={handleNavigate} />
              </div>
            )}
          </nav>
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <NavItem view="settings" label={t('nav.settings')} icon={ICONS.Settings} currentView={currentView} onClick={handleNavigate} />
            <button onClick={() => api.logout()} className="flex items-center gap-3 px-4 py-3 rounded-2xl w-full text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              <span className="text-sm">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="lg:ml-72 min-h-screen">
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-6 lg:px-10 h-20 flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <div className="hidden lg:block text-sm font-bold text-slate-400 uppercase tracking-widest">{settings?.nom || "GaragePro"} {t('nav.atelier')}</div>
          <div className="flex items-center gap-2 sm:gap-4">
            
            <button onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-all font-black text-xs uppercase tracking-widest border border-transparent hover:border-blue-100 dark:hover:border-slate-700">
               {language}
            </button>

            <button id="app-theme-toggle" onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-all">
               {darkMode ? (
                 <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="3" r="1.5" /><circle cx="12" cy="21" r="1.5" /><circle cx="3" cy="12" r="1.5" /><circle cx="21" cy="12" r="1.5" /><circle cx="5.64" cy="5.64" r="1.5" /><circle cx="18.36" cy="18.36" r="1.5" /><circle cx="5.64" cy="18.36" r="1.5" /><circle cx="18.36" cy="5.64" r="1.5" /></svg>
               ) : (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
               )}
            </button>
            <div className="relative" ref={notifRef}>
              <button id="app-notifications" onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-all relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {unreadCount > 0 && (<span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-pulse">{unreadCount}</span>)}
              </button>
              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-top-4 duration-200 z-[100]">
                  <div className="p-5 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">{t('dashboard.notifications')}</h4>
                    <button onClick={handleMarkAllNotifsRead} className="text-[10px] font-black text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-tight">{t('dashboard.mark_read')}</button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                    {notifications.length === 0 ? (<div className="p-10 text-center text-slate-400 italic text-sm">{t('dashboard.all_calm')}</div>) : (notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-all group flex gap-3 ${getNotifStyles(n.type, n.read)}`}>
                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.read ? (n.type === 'error' ? 'bg-rose-500 shadow-sm shadow-rose-500/50' : n.type === 'success' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-blue-500 shadow-sm') : 'bg-transparent'}`}></div>
                            <div className="flex-1">
                                <p className={`text-xs font-black ${getNotifTitleColor(n.type, n.read)}`}>{n.title}</p>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{n.created_at ? new Date(n.created_at).toLocaleDateString() : t('common.today')}</span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!n.read && <button onClick={() => handleMarkNotifRead(n.id)} className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase">{t('dashboard.read')}</button>}
                                        <button onClick={() => handleDeleteNotif(n.id)} className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase">{t('dashboard.delete')}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )))}
                  </div>
                </div>
              )}
            </div>
            <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-1 sm:mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block"><p className="text-xs font-black dark:text-white uppercase truncate max-w-[120px]">{session.user.email.split('@')[0]}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{userRole === 'super_admin' ? t('nav.master_admin') : t('nav.workshop_manager')}</p></div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-blue-600">{session.user.email[0].toUpperCase()}</div>
            </div>
          </div>
        </header>
        <div className="p-6 lg:p-10">{renderContent()}</div>
      </main>

      {/* Floating Help Button */}
      <button
        onClick={() => setShowHelpModal(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 group"
        title="Centre d'aide"
      >
        <span className="text-2xl font-black group-hover:rotate-12 transition-transform">?</span>
      </button>

      {showHelpModal && (
        <HelpModal 
          onClose={() => setShowHelpModal(false)} 
          onRestartTutorial={() => { setShowHelpModal(false); setShowTutorial(true); }}
          currentViewName={currentView}
        />
      )}

      {showTutorial && (
        <Tutorial 
          view={currentView} 
          onClose={() => { 
            setShowTutorial(false); 
            // On marque comme vu dans le localStorage pour ne pas réafficher automatiquement
            const seen = JSON.parse(localStorage.getItem('gp_tutorials_seen') || '[]'); 
            if (!seen.includes(currentView)) {
              seen.push(currentView); 
              localStorage.setItem('gp_tutorials_seen', JSON.stringify(seen)); 
            }
          }} 
        />
      )}

      {toast && <div className="fixed bottom-24 right-6 z-[100] animate-in slide-in-from-right"><div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 min-w-[300px] ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : toast.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' : toast.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}><h4 className="font-black text-sm">{toast.title}</h4><p className="text-xs opacity-80">{toast.message}</p></div></div>}
    </div>
  );
};

// Wrapper simple pour fournir le contexte
const App: React.FC = () => {
  return (
    <LanguageProvider>
      <GarageProApp />
    </LanguageProvider>
  );
};

export default App;
