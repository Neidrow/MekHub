
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Client, Vehicule, RendezVous, Facture, Devis, StockItem, Mecanicien, GarageSettings, Notification } from './types.ts';
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
  alertCount?: number;
  currentView: ViewState;
  onClick: (view: ViewState) => void;
}

const NavItem: React.FC<NavItemProps> = ({ view, label, icon: Icon, color = 'blue', isPremium = false, alertCount, currentView, onClick }) => {
  const isActive = currentView === view;
  const baseClasses = "flex items-center justify-between px-4 py-3 rounded-2xl transition-all w-full group relative";
  
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
      <div className="flex items-center gap-2">
        {isPremium && (
          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600'}`}>
            PRO
          </span>
        )}
        {alertCount !== undefined && alertCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-sm ring-2 ring-white">
            {alertCount > 9 ? '9+' : alertCount}
          </span>
        )}
      </div>
    </button>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  
  // Initialisation de la vue depuis le localStorage ou 'dashboard' par défaut
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    const savedView = localStorage.getItem('garagepro_current_view');
    return (savedView as ViewState) || 'dashboard';
  });

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
  
  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

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

    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- AUTOMATISATION DES STATUTS RDV ---
  useEffect(() => {
    if (!session || rendezVous.length === 0) return;

    const checkAndAutoUpdateStatus = async () => {
      const now = new Date();
      let hasUpdates = false;

      const updates = rendezVous.map(async (rdv) => {
        // Ignorer les RDV annulés ou déjà terminés
        if (rdv.statut === 'annule' || rdv.statut === 'termine') return;

        // Construire la date de début
        // rdv.date est au format YYYY-MM-DD, rdv.heure au format HH:MM
        const startDateTime = new Date(`${rdv.date}T${rdv.heure}:00`);
        
        // Calculer la durée en millisecondes
        let durationMs = 60 * 60 * 1000; // 1h par défaut
        if (rdv.duree) {
          if (rdv.duree.includes('m')) durationMs = parseInt(rdv.duree) * 60 * 1000;
          else if (rdv.duree.includes('h')) durationMs = parseFloat(rdv.duree) * 60 * 60 * 1000;
        }

        const endDateTime = new Date(startDateTime.getTime() + durationMs);

        let newStatus: RendezVous['statut'] | null = null;

        // Logique de transition
        if (now >= endDateTime) {
          // Si l'heure actuelle dépasse la fin, on passe à TERMINE
          if (rdv.statut !== 'termine') {
            newStatus = 'termine';
          }
        } else if (now >= startDateTime && now < endDateTime) {
          // Si l'heure actuelle est dans l'intervalle, on passe à EN COURS
          // Uniquement si le statut actuel est 'en_attente'
          if (rdv.statut === 'en_attente') {
            newStatus = 'en_cours';
          }
        }

        if (newStatus) {
          hasUpdates = true;
          // Mise à jour silencieuse pour ne pas spammer
          await api.updateData('rendez_vous', rdv.id, { statut: newStatus });
        }
      });

      await Promise.all(updates);

      // Si des changements ont eu lieu, on recharge les données pour mettre à jour l'interface
      if (hasUpdates) {
        loadAllData();
      }
    };

    // Vérifier immédiatement puis toutes les 60 secondes
    checkAndAutoUpdateStatus();
    const intervalId = setInterval(checkAndAutoUpdateStatus, 60000);

    return () => clearInterval(intervalId);
  }, [rendezVous, session]); // Dépendance à rendezVous pour avoir les dernières données

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
        // Lecture directe du localStorage pour s'assurer qu'on n'écrase pas la vue courante avec un stale state
        const savedView = localStorage.getItem('garagepro_current_view');
        // Si l'utilisateur était en super-admin (via cache) mais n'a plus les droits, on le remet au dashboard
        if (savedView === 'super-admin') {
          setCurrentView('dashboard');
          localStorage.setItem('garagepro_current_view', 'dashboard');
        }
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
    setNotifications([]);
    setSettings(null);
    setLoading(false);
    setMustChangePassword(false);
    setShowWelcome(false);
    setShowGooglePrompt(false);
    setIsSuspended(false);
    // On ne supprime PAS 'garagepro_current_view' ici pour garder la préférence utilisateur même après déconnexion/expiration
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

      // Générer des notifications locales pour les factures impayées
      const today = new Date();
      const generatedNotifs: Notification[] = [];
      
      f.forEach(inv => {
        if (inv.statut === 'non_payee') {
          const invDate = new Date(inv.date_facture);
          const diffTime = Math.abs(today.getTime() - invDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 7) {
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

      // Générer des notifications locales pour le STOCK BAS
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

      // Fusionner les notifications DB et locales, triées par date
      const allNotifs = [...notifs, ...generatedNotifs].sort((a, b) => {
         const da = a.created_at ? new Date(a.created_at).getTime() : 0;
         const db = b.created_at ? new Date(b.created_at).getTime() : 0;
         return db - da;
      });

      setNotifications(allNotifs);

      if (sett && sett.google_calendar_enabled === undefined) {
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
    // Mise à jour locale du state
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
    // Supprimer visuellement (local ou DB)
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
      await loadAllData();
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

  const handleGoogleSkip = async () => {
    try {
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
  const isPremium = userRole === 'user_premium' || isSuperAdmin;

  const navigateTo = (view: ViewState) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
    localStorage.setItem('garagepro_current_view', view);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  // Calculer les alertes de stock
  const stockAlerts = stock.filter(i => i.quantite <= i.seuil_alerte).length;

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

      <aside className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-100 flex flex-col z-40 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 text-center flex flex-col items-center">
          {settings?.logo_url ? (
            <img 
              src={settings.logo_url} 
              alt="Logo Garage" 
              className="w-20 h-20 rounded-[2rem] object-cover shadow-lg mb-4 border-2 border-white ring-2 ring-slate-100" 
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl mb-4">
              {garageDisplayName.charAt(0)}
            </div>
          )}
          <h1 className="text-lg font-black text-slate-800 truncate w-full">{garageDisplayName}</h1>
          <div className={`mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isPremium ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
             {isPremium ? 'Abonnement Premium' : 'Abonnement Basic'}
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-hide">
          {isSuperAdmin && <NavItem view="super-admin" label="Master SaaS" icon={ICONS.Dashboard} color="purple" currentView={currentView} onClick={navigateTo} />}
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
          
          <div className="flex items-center gap-6 ml-auto">
            {/* Notification Center */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)} 
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right z-50">
                  <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-slate-800">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={async () => { await api.markAllNotificationsAsRead(); loadAllData(); }} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Tout lire</button>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-slate-400 text-sm font-medium">Aucune notification</p>
                      </div>
                    ) : (
                      notifications.map((notif, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => markAsRead(notif)}
                          className={`p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 flex gap-3 group relative ${!notif.read ? 'bg-blue-50/30' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            notif.type === 'error' ? 'bg-rose-100 text-rose-500' :
                            notif.type === 'warning' ? 'bg-amber-100 text-amber-500' :
                            notif.type === 'success' ? 'bg-emerald-100 text-emerald-500' :
                            'bg-blue-100 text-blue-500'
                          }`}>
                            {notif.type === 'warning' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> : 
                             notif.type === 'success' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> :
                             notif.type === 'error' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> :
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                          </div>
                          <div className="flex-1 pr-6">
                            <p className={`text-sm ${!notif.read ? 'font-black text-slate-800' : 'font-bold text-slate-600'}`}>{notif.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                            {notif.created_at && <p className="text-[9px] text-slate-400 mt-1.5 font-medium uppercase tracking-wider">{new Date(notif.created_at).toLocaleDateString()}</p>}
                          </div>
                          {!notif.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></div>}
                          
                          {/* Bouton Supprimer */}
                          <button 
                            onClick={(e) => deleteNotification(e, notif)}
                            className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Supprimer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <span className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{session.user?.email}</span>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-10 flex-1 overflow-y-auto">
          {currentView === 'super-admin' && isSuperAdmin && <SuperAdmin />}
          {currentView === 'dashboard' && (
            <Dashboard 
              customers={clients} 
              vehicles={vehicules} 
              mecaniciens={mecaniciens}
              appointments={rendezVous}
              invoices={factures}
              onAddAppointment={async (app) => { await api.postData('rendez_vous', app); loadAllData(); }} 
              onNavigate={navigateTo} 
            />
          )}
          {currentView === 'customers' && (
            <Customers 
              customers={clients} 
              onAddCustomer={async (c) => { await api.postData('clients', c); loadAllData(); }}
              onUpdateCustomer={async (id, updates) => { await api.updateData('clients', id, updates); loadAllData(); }}
              onDeleteCustomer={async (id) => { await api.deleteData('clients', id); loadAllData(); }}
            />
          )}
          {currentView === 'inventory' && (
            <Inventory 
              inventory={stock} 
              userRole={userRole} 
              onAddItem={async (item) => { await api.postData('stock', item); loadAllData(); }} 
              onUpdateItem={async (id, updates) => { await api.updateData('stock', id, updates); loadAllData(); }}
              onDeleteItem={async (id) => { await api.deleteData('stock', id); loadAllData(); }} 
            />
          )}
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
          {currentView === 'quotes' && (
            <Quotes 
              devis={devis} 
              customers={clients}
              vehicles={vehicules}
              settings={settings}
              userRole={userRole}
              onAdd={async (d) => { await api.postData('devis', d); loadAllData(); }}
              onUpdate={async (id, updates) => { await api.updateData('devis', id, updates); loadAllData(); }}
              onDelete={async (id) => { await api.deleteData('devis', id); loadAllData(); }}
              onAddInvoice={async (f) => { await api.postData('factures', f); loadAllData(); }}
              onNavigate={navigateTo}
            />
          )}
          {currentView === 'invoices' && (
            <Invoices 
              invoices={factures} 
              customers={clients}
              vehicles={vehicules}
              settings={settings}
              onAdd={async (f) => { await api.postData('factures', f); loadAllData(); }}
              onUpdate={async (id, updates) => { await api.updateData('factures', id, updates); loadAllData(); }}
              onDelete={async (id) => { await api.deleteData('factures', id); loadAllData(); }}
            />
          )}
          {currentView === 'ai-assistant' && <AIAssistant />}
          {currentView === 'settings' && (
            <Settings 
              initialSettings={settings} 
              onSave={async (s) => { await api.saveSettings(s); loadAllData(); }}
              onRefresh={loadAllData}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
