
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Client, Vehicule, RendezVous, Facture, Devis, StockItem, Mecanicien, GarageSettings, Notification, SystemMaintenance } from './types.ts';
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
import PublicQuoteView from './components/PublicQuoteView.tsx';
import Tutorial from './components/Tutorial.tsx';

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
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
            {alertCount > 9 ? '9+' : alertCount}
          </span>
        )}
      </div>
    </button>
  );
};

const App: React.FC = () => {
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
  const [isSuspended, setIsSuspended] = useState(false);
  
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', title: string, message: string } | null>(null);

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
  const notifRef = useRef<HTMLDivElement>(null);

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passLoading, setPassLoading] = useState(false);

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

  // Logique de déclenchement automatique du tutoriel
  useEffect(() => {
    if (session && !loading && !mustChangePassword && !showWelcome && !isPublicView) {
      const tutorialsSeen = JSON.parse(localStorage.getItem('gp_tutorials_seen') || '[]');
      if (!tutorialsSeen.includes(currentView)) {
        setShowTutorial(true);
      } else {
        setShowTutorial(false);
      }
    }
  }, [currentView, session, loading, mustChangePassword, showWelcome]);

  useEffect(() => {
    if (!session || isSuspended || rendezVous.length === 0) return;

    const checkAndAutoUpdateStatus = async () => {
      const now = new Date();
      let hasUpdates = false;

      const updates = rendezVous.map(async (rdv) => {
        if (rdv.statut === 'annule' || rdv.statut === 'termine') return;

        const [year, month, day] = rdv.date.split('-').map(Number);
        const [hours, minutes] = rdv.heure.split(':').map(Number);
        const startDateTime = new Date(year, month - 1, day, hours, minutes, 0);
        
        let durationMs = 60 * 60 * 1000;
        if (rdv.duree) {
          const val = parseInt(rdv.duree);
          if (rdv.duree.includes('m')) durationMs = val * 60 * 1000;
          else if (rdv.duree.includes('h')) durationMs = val * 60 * 1000;
        }

        const endDateTime = new Date(startDateTime.getTime() + durationMs);
        let newStatus: RendezVous['statut'] | null = null;

        if (now >= endDateTime) {
          if (rdv.statut !== 'termine') newStatus = 'termine';
        } else if (now >= startDateTime && now < endDateTime) {
          if (rdv.statut === 'en_attente') newStatus = 'en_cours';
        }

        if (newStatus) {
          hasUpdates = true;
          await api.updateData('rendez_vous', rdv.id, { statut: newStatus });
        }
      });

      await Promise.all(updates);
      if (hasUpdates) loadAllData();
    };

    checkAndAutoUpdateStatus();
    const intervalId = setInterval(checkAndAutoUpdateStatus, 15000);
    return () => clearInterval(intervalId);
  }, [rendezVous, session, isSuspended]);

  const handleSession = async (sess: any) => {
    if (sess) {
      const email = sess.user?.email;
      const metadata = sess.user?.user_metadata || {};
      
      if (metadata.role !== 'super_admin') {
        const status = await api.checkStatus(email);
        if (status === 'Suspendu') {
          setIsSuspended(true);
          setLoading(false);
          return;
        }
      }
      
      setSession(sess);
      setIsSuspended(false);
      const needsChange = metadata.needs_password_change;
      
      if (metadata.role === 'super_admin') {
        if (!currentView.startsWith('super-admin')) {
           setCurrentView('super-admin-overview');
        }
      } else {
        // Pour les utilisateurs normaux, on garde la vue sauvegardée, 
        // sauf s'ils ont besoin de changer le mot de passe (on gère ça dans handleUpdatePassword)
        const savedView = localStorage.getItem('garagepro_current_view') as ViewState;
        if (savedView && !savedView.startsWith('super-admin')) {
           setCurrentView(savedView);
        } else {
           setCurrentView('dashboard');
           localStorage.setItem('garagepro_current_view', 'dashboard');
        }
      }

      if (needsChange) {
        setMustChangePassword(true);
        setLoading(false);
      } else {
        setMustChangePassword(false);
        if (metadata.role !== 'super_admin') {
            await loadAllData();
        } else {
            setLoading(false);
        }
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
    setNotifications([]);
    setSettings(null);
    setLoading(false);
    setMustChangePassword(false);
    setShowWelcome(false);
    setShowGooglePrompt(false);
    setShowTutorial(false);
    setIsSuspended(false);
    sessionStorage.removeItem('gp_google_dismiss_session');
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
      const [c, v, a, m, s, d, f, sett, notifs] = await Promise.all([
        api.fetchData<Client>('clients'),
        api.fetchData<Vehicule>('vehicules'),
        api.fetchData<RendezVous>('rendez_vous'),
        api.fetchData<Mecanicien>('mecaniciens'),
        api.fetchData<StockItem>('stock'),
        api.fetchData<Devis>('devis'),
        api.fetchData<Facture>('factures'),
        api.getSettings(),
        api.fetchNotifications()
      ]);
      setClients(c);
      setVehicules(v);
      setRendezVous(a);
      setMecaniciens(m);
      setStock(s);
      setDevis(d);
      setFactures(f);
      setSettings(sett);

      const today = new Date();
      const generatedNotifs: Notification[] = [];
      
      f.forEach(inv => {
        if (inv.statut === 'non_payee') {
          const invDate = new Date(inv.date_facture);
          const diffTime = today.getTime() - invDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays >= 7) {
             const client = c.find(cl => cl.id === inv.client_id);
             generatedNotifs.push({
               id: `gen_inv_${inv.id}`,
               type: 'warning',
               title: 'Retard de Paiement',
               message: `La facture ${inv.numero_facture} de ${client ? client.nom : 'Client inconnu'} est en retard de ${diffDays} jours.`,
               read: false,
               isLocal: true,
               link: 'invoices',
               created_at: new Date().toISOString()
             });
          }
        }
      });

      s.forEach(item => {
        if (item.quantite <= item.seuil_alerte) {
          generatedNotifs.push({
            id: `gen_stk_${item.id}`,
            type: 'error',
            title: 'Stock Critique',
            message: `L'article "${item.nom}" est sous le seuil d'alerte (${item.quantite} restants).`,
            read: false,
            isLocal: true,
            link: 'inventory',
            created_at: new Date().toISOString()
          });
        }
      });

      const allNotifs = [...notifs, ...generatedNotifs].sort((a, b) => {
         const da = a.created_at ? new Date(a.created_at).getTime() : 0;
         const db = b.created_at ? new Date(b.created_at).getTime() : 0;
         return db - da;
      });

      setNotifications(allNotifs);

      const isGoogleConnected = sett?.google_calendar_enabled || false;
      const isDismissedForever = sett?.google_prompt_dismissed || false;
      const isDismissedForSession = sessionStorage.getItem('gp_google_dismiss_session') === 'true';

      if (!isGoogleConnected && !isDismissedForever && !isDismissedForSession) {
        setShowGooglePrompt(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notif: Notification) => {
    if (!notif.isLocal) {
      await api.markNotificationAsRead(notif.id);
    }
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    
    if (notif.link) {
      navigateTo(notif.link);
      setIsNotifOpen(false);
    }
  };

  const deleteNotification = async (e: React.MouseEvent, notif: Notification) => {
    e.stopPropagation();
    if (!notif.isLocal) {
      await api.deleteNotification(notif.id);
    }
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
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
      
      // Nouveau compte -> Direction Paramètres
      setCurrentView('settings');
      localStorage.setItem('garagepro_current_view', 'settings');
      
      const isSuperAdmin = session?.user?.user_metadata?.role === 'super_admin';
      if (!isSuperAdmin) await loadAllData();
    } catch (err: any) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      await api.requestGoogleAccess();
      await api.saveSettings({ google_calendar_enabled: true });
      setShowGooglePrompt(false);
      await loadAllData();
    } catch (err: any) {
      console.error("Échec connexion Google:", err);
      alert(err.message || "La connexion Google a échoué.");
    }
  };

  const handleGoogleRemindLater = () => {
    sessionStorage.setItem('gp_google_dismiss_session', 'true');
    setShowGooglePrompt(false);
  };

  const handleGoogleDismissForever = async () => {
    try {
      await api.saveSettings({ google_prompt_dismissed: true });
      setShowGooglePrompt(false);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde de la préférence", err);
      setShowGooglePrompt(false);
    }
  };

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4000);
  };

  const markTutorialAsSeen = () => {
    const tutorialsSeen = JSON.parse(localStorage.getItem('gp_tutorials_seen') || '[]');
    if (!tutorialsSeen.includes(currentView)) {
      tutorialsSeen.push(currentView);
      localStorage.setItem('gp_tutorials_seen', JSON.stringify(tutorialsSeen));
    }
    setShowTutorial(false);
  };

  if (isPublicView) {
    return <PublicQuoteView quoteId={publicQuoteId!} />;
  }

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-10 text-center relative overflow-hidden">
        <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px]"></div>
        <div className="relative z-10 bg-white/5 backdrop-blur-xl p-10 lg:p-16 rounded-[4rem] border border-white/10 shadow-2xl max-w-xl animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-rose-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-rose-600/40">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           </div>
           <h1 className="text-4xl font-black text-white tracking-tighter mb-4">Accès Suspendu</h1>
           <p className="text-slate-300 font-medium leading-relaxed mb-10 text-lg">Votre compte partenaire a été désactivé. Veuillez contacter l'administration.</p>
           <button onClick={async () => { await api.logout(); window.location.reload(); }} className="px-10 py-5 bg-white text-slate-900 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-200 transition-all shadow-xl">Retour à la connexion</button>
        </div>
      </div>
    );
  }

  if (maintenance.enabled && session?.user?.user_metadata?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-10 text-center relative overflow-hidden">
         <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[120px]"></div>
         <div className="relative z-10 bg-white/5 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-2xl max-w-lg">
            <div className="w-24 h-24 bg-amber-500/20 text-amber-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl animate-pulse">
               <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-4">Maintenance en cours</h1>
            <p className="text-slate-300 font-medium leading-relaxed text-sm mb-8">{maintenance.message || "Nous effectuons une mise à jour importante."}</p>
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Actualiser</button>
         </div>
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
  const isPremium = userRole === 'user_premium' || isSuperAdmin;
  const userId = session.user.id;

  const navigateTo = (view: ViewState) => {
    if (view !== currentView) {
        api.logActivity('navigation', view);
    }
    setCurrentView(view);
    setIsSidebarOpen(false);
    localStorage.setItem('garagepro_current_view', view);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const stockAlerts = stock.filter(i => i.quantite <= i.seuil_alerte).length;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500">
      
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-none">
           <div className={`pointer-events-auto px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px] border border-white/10 backdrop-blur-md ${
             toast.type === 'success' ? 'bg-slate-900 text-white dark:bg-emerald-600' : 
             toast.type === 'error' ? 'bg-rose-600 text-white' : 
             'bg-blue-600 text-white'
           }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                toast.type === 'error' ? 'bg-rose-800/20 text-white' :
                'bg-blue-500/20 text-white'
              }`}>
                 {toast.type === 'success' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                 {toast.type === 'error' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>}
                 {toast.type === 'info' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              </div>
              <div>
                 <h4 className="font-black text-sm tracking-tight">{toast.title}</h4>
                 <p className="text-xs font-medium opacity-90">{toast.message}</p>
              </div>
           </div>
        </div>
      )}

      {showWelcome && (
        <WelcomeOverlay 
          garageName={garageDisplayName} 
          onComplete={() => setShowWelcome(false)} 
        />
      )}

      {showTutorial && !showWelcome && !isSuperAdmin && (
        <Tutorial 
          view={currentView} 
          onClose={markTutorialAsSeen} 
        />
      )}

      {showGooglePrompt && !showWelcome && !isSuperAdmin && !showTutorial && (
        <GoogleCalendarModal 
          onConnect={handleGoogleConnect}
          onRemindLater={handleGoogleRemindLater}
          onDismissForever={handleGoogleDismissForever}
        />
      )}

      {mustChangePassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-md p-10 shadow-2xl border border-slate-100 dark:border-slate-700">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white text-center mb-6">Initialisation du compte</h2>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
               <input required type="password" placeholder="Nouveau mot de passe" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-2xl outline-none dark:text-white focus:ring-2 focus:ring-blue-500/20" value={newPass} onChange={e => setNewPass(e.target.value)} />
               <input required type="password" placeholder="Confirmer" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-2xl outline-none dark:text-white focus:ring-2 focus:ring-blue-500/20" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
               {passError && <p className="text-rose-500 text-xs font-bold text-center">{passError}</p>}
               <button disabled={passLoading} type="submit" className="w-full py-5 bg-slate-900 dark:bg-blue-600 text-white font-black rounded-2xl hover:bg-black dark:hover:bg-blue-700 transition-all">Activer mon compte</button>
            </form>
          </div>
        </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      <aside className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col z-40 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 text-center flex flex-col items-center">
          {settings?.logo_url ? (
            <img 
              src={settings.logo_url} 
              alt="Logo Garage" 
              className="w-20 h-20 rounded-[2rem] object-cover shadow-lg mb-4 border-2 border-white dark:border-slate-800 ring-2 ring-slate-100 dark:ring-slate-800" 
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl mb-4 shadow-xl shadow-blue-500/20">
              {isSuperAdmin ? 'SA' : garageDisplayName.charAt(0)}
            </div>
          )}
          <h1 className="text-lg font-black text-slate-800 dark:text-white truncate w-full">{isSuperAdmin ? 'Administration' : garageDisplayName}</h1>
          <div className={`mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isPremium ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
             {isSuperAdmin ? 'Super Admin' : (isPremium ? 'Premium' : 'Standard')}
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-hide">
          {isSuperAdmin ? (
            <>
              <NavItem view="super-admin-overview" label="Vue d'ensemble" icon={ICONS.Dashboard} color="purple" currentView={currentView} onClick={navigateTo} />
              <NavItem view="super-admin-garages" label="Garages" icon={ICONS.AdminGarages} color="indigo" currentView={currentView} onClick={navigateTo} />
              <NavItem view="super-admin-communication" label="Communication" icon={ICONS.AdminComm} color="amber" currentView={currentView} onClick={navigateTo} />
              <NavItem view="super-admin-logs" label="Sécurité & Logs" icon={ICONS.AdminLogs} color="rose" currentView={currentView} onClick={navigateTo} />
            </>
          ) : (
            <>
              <NavItem view="dashboard" label="Dashboard" icon={ICONS.Dashboard} currentView={currentView} onClick={navigateTo} />
              <NavItem view="appointments" label="Rendez-vous" icon={ICONS.Appointments} currentView={currentView} onClick={navigateTo} />
              <NavItem view="customers" label="Clients" icon={ICONS.Customers} currentView={currentView} onClick={navigateTo} />
              <NavItem view="vehicles" label="Véhicules" icon={ICONS.Vehicles} currentView={currentView} onClick={navigateTo} />
              <NavItem view="mechanics" label="Équipe" icon={ICONS.Mechanics} currentView={currentView} onClick={navigateTo} />
              <NavItem view="inventory" label="Stocks" icon={ICONS.Inventory} isPremium={true} alertCount={stockAlerts} currentView={currentView} onClick={navigateTo} />
              <NavItem view="quotes" label="Devis" icon={ICONS.Quotes} currentView={currentView} onClick={navigateTo} />
              <NavItem view="invoices" label="Factures" icon={ICONS.Invoices} currentView={currentView} onClick={navigateTo} />
              <NavItem view="ai-assistant" label="Assistant AI" icon={ICONS.AI} currentView={currentView} onClick={navigateTo} />
              <NavItem view="settings" label="Paramètres" icon={ICONS.Settings} currentView={currentView} onClick={navigateTo} />
            </>
          )}
        </nav>
        <div className="p-4 border-t dark:border-slate-800">
          <button onClick={handleLogout} className="w-full py-4 text-rose-500 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all flex items-center justify-center gap-2">Déconnexion</button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 flex flex-col min-w-0 relative">
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-20">
          <button className="lg:hidden p-2 text-slate-500 dark:text-slate-400" onClick={() => setIsSidebarOpen(true)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              title={darkMode ? "Passer en mode clair" : "Passer en mode sombre"}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>

            <div className="relative" ref={notifRef}>
              <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors relative rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-4 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right z-50">
                  <div className="p-4 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="font-black text-slate-800 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && <button onClick={async () => { await api.markAllNotificationsAsRead(); loadAllData(); }} className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline">Tout lire</button>}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? <div className="p-8 text-center"><p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Aucune notification</p></div> : 
                      notifications.map((notif, idx) => (
                        <div key={idx} onClick={() => markAsRead(notif)} className={`p-4 border-b border-slate-50 dark:border-slate-700/50 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 flex gap-3 group relative ${!notif.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${notif.type === 'error' ? 'bg-rose-100 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400' : notif.type === 'warning' ? 'bg-amber-100 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400' : notif.type === 'success' ? 'bg-emerald-100 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-blue-100 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400'}`}>
                            {notif.type === 'warning' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> : 
                             notif.type === 'success' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> :
                             notif.type === 'error' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> :
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                          </div>
                          <div className="flex-1 pr-6">
                            <p className={`text-sm ${!notif.read ? 'font-black text-slate-800 dark:text-slate-100' : 'font-bold text-slate-600 dark:text-slate-400'}`}>{notif.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                          </div>
                          {!notif.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></div>}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px] hidden sm:block">{session?.user?.email}</span>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-10 flex-1 overflow-y-auto scrollbar-hide">
          {currentView.startsWith('super-admin') && isSuperAdmin && <SuperAdmin currentTab={currentView} onNotify={showToast} />}
          {currentView === 'dashboard' && <Dashboard customers={clients} vehicles={vehicules} mecaniciens={mecaniciens} appointments={rendezVous} invoices={factures} onAddAppointment={async (app) => { await api.postData('rendez_vous', app); loadAllData(); }} onNavigate={navigateTo} />}
          {currentView === 'customers' && <Customers customers={clients} onAddCustomer={async (c) => { await api.postData('clients', c); loadAllData(); }} onUpdateCustomer={async (id, updates) => { await api.updateData('clients', id, updates); loadAllData(); }} onDeleteCustomer={async (id) => { await api.deleteData('clients', id); loadAllData(); }} />}
          {currentView === 'inventory' && <Inventory inventory={stock} userRole={userRole} onAddItem={async (item) => { await api.postData('stock', item); loadAllData(); }} onUpdateItem={async (id, updates) => { await api.updateData('stock', id, updates); loadAllData(); }} onDeleteItem={async (id) => { await api.deleteData('stock', id); loadAllData(); }} />}
          {currentView === 'appointments' && <Appointments appointments={rendezVous} customers={clients} vehicles={vehicules} mecaniciens={mecaniciens} onAddAppointment={async (app) => { await api.postData('rendez_vous', app); loadAllData(); }} onUpdateStatus={async (id, status) => { await api.updateData('rendez_vous', id, { statut: status }); loadAllData(); }} onUpdateAppointment={async (id, updates) => { await api.updateData('rendez_vous', id, updates); loadAllData(); }} onDelete={async (id) => { await api.deleteData('rendez_vous', id); loadAllData(); }} onNavigate={navigateTo} />}
          {currentView === 'vehicles' && <Vehicles vehicles={vehicules} customers={clients} appointments={rendezVous} invoices={factures} onAdd={async (v) => { await api.postData('vehicules', v); loadAllData(); }} onUpdate={async (id, updates) => { await api.updateData('vehicules', id, updates); loadAllData(); }} onDelete={async (id) => { await api.deleteData('vehicules', id); loadAllData(); }} />}
          {currentView === 'mechanics' && <Mechanics mechanics={mecaniciens} onAdd={async (m) => { await api.postData('mecaniciens', m); loadAllData(); }} onUpdate={async (id, updates) => { await api.updateData('mecaniciens', id, updates); loadAllData(); }} onDelete={async (id) => { await api.deleteData('mecaniciens', id); loadAllData(); }} />}
          {currentView === 'quotes' && <Quotes devis={devis} customers={clients} vehicles={vehicules} settings={settings} userRole={userRole} invoices={factures} onAdd={async (d) => { await api.postData('devis', d); loadAllData(); }} onUpdate={async (id, updates) => { await api.updateData('devis', id, updates); loadAllData(); }} onDelete={async (id) => { await api.deleteData('devis', id); loadAllData(); }} onAddInvoice={async (f) => { await api.postData('factures', f); loadAllData(); }} onNavigate={navigateTo} onNotify={showToast} />}
          {currentView === 'invoices' && <Invoices invoices={factures} customers={clients} vehicles={vehicules} settings={settings} onAdd={async (f) => { await api.postData('factures', f); loadAllData(); }} onUpdate={async (id, updates) => { await api.updateData('factures', id, updates); loadAllData(); }} onDelete={async (id) => { await api.deleteData('factures', id); loadAllData(); }} onNotify={showToast} />}
          {currentView === 'ai-assistant' && <AIAssistant userId={userId} userRole={userRole} />}
          {currentView === 'settings' && <Settings initialSettings={settings} onSave={async (s) => { await api.saveSettings(s); loadAllData(); }} onRefresh={loadAllData} />}
        </div>

        {!isSuperAdmin && (
          <button 
            onClick={() => setShowTutorial(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-slate-900 dark:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-black dark:hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 group"
            title="Aide & Tutoriel"
          >
            <span className="text-2xl font-black group-hover:rotate-12 transition-transform">?</span>
          </button>
        )}
      </main>
    </div>
  );
};

export default App;
