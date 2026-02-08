
import { createClient } from '@supabase/supabase-js';
import { Client, Vehicule, RendezVous, Mecanicien, StockItem, GarageSettings, Devis, Facture, UserRole, Notification, StockHistory, SignatureMetadata, QuoteHistory, ActivityLog, SystemMaintenance, PasswordResetRequest } from '../types';
import { sendInvitationEmail, sendResetPasswordEmail } from './emailService';

const supabaseUrl = 'https://qvyqptiekeunidxdomne.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2eXFwdGlla2V1bmlkeGRvbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzUwODAsImV4cCI6MjA4MTYxMTA4MH0.gIpXpTSt3wIWhUmipuy53a1j_JeLh5rRI1gpkXVu-EA';

export const supabase = createClient(supabaseUrl, supabaseKey);

const inviteClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

// --- CONFIGURATION GOOGLE CALENDAR ---
// Nouveau Client ID (Projet Production ishlem.pro)
const GOOGLE_CLIENT_ID = "118094673906-ucro4dqaprre8s4h1kjv6d58sog9f8eh.apps.googleusercontent.com";

class ApiService {
  private googleToken: string | null = null;
  private tokenClient: any = null;

  async requestGoogleAccess(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!(window as any).google) {
          reject(new Error("Le service Google n'est pas disponible. Vérifiez votre connexion ou bloqueur de pub."));
          return;
        }

        // Initialisation du client si pas encore fait
        if (!this.tokenClient) {
          this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            // Scope strict pour gérer les événements
            scope: 'https://www.googleapis.com/auth/calendar.events',
            callback: (response: any) => {
              if (response.error) {
                console.error("Erreur OAuth Google:", response);
                // Gestion spécifique de l'erreur "popup_closed_by_user" ou erreurs de configuration
                if (response.error === 'popup_closed_by_user') {
                    reject(new Error("La connexion a été annulée."));
                } else {
                    reject(new Error(`Accès refusé par Google (${response.error}). Vérifiez que l'app est bien publiée.`));
                }
              } else {
                this.googleToken = response.access_token;
                sessionStorage.setItem('google_access_token', response.access_token);
                resolve(response.access_token);
              }
            },
          });
        }

        // Demande du token avec 'consent' pour forcer le choix du compte si besoin
        // Cela permet de changer d'utilisateur Google si on s'est trompé
        this.tokenClient.requestAccessToken({ prompt: 'consent' });

      } catch (err: any) { 
        console.error("Erreur initialisation Google:", err);
        reject(err); 
      }
    });
  }

  getStoredGoogleToken() { return this.googleToken || sessionStorage.getItem('google_access_token'); }

  async logout() { 
    sessionStorage.removeItem('google_access_token');
    this.googleToken = null;
    
    // Révocation du token Google si existant pour sécurité
    if ((window as any).google && this.googleToken) {
        try {
            (window as any).google.accounts.oauth2.revoke(this.googleToken, () => {
                console.log('Token Google révoqué');
            });
        } catch (e) {
            console.warn("Impossible de révoquer le token Google", e);
        }
    }

    await supabase.auth.signOut(); 
  }

  async logActivity(action_type: ActivityLog['action_type'], target: string, details: string = '') {
    try {
      // Optimisation : On ne log pas la navigation pour économiser la BDD
      if (action_type === 'navigation') return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const simplifiedDetails = details.length > 100 ? details.substring(0, 97) + '...' : details;

      // 1. Insérer le nouveau log (Action uniquement)
      await supabase.from('activity_logs').insert([{
        user_id: user.id,
        email: user.email,
        action_type,
        target,
        details: simplifiedDetails
      }]);

      // 2. Nettoyage strict : Ne garder que les 5 dernières actions pour CET utilisateur
      // On sélectionne à partir du 6ème élément (index 5) pour suppression
      const { data: logsToDelete } = await supabase
        .from('activity_logs')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(5, 1000); 

      if (logsToDelete && logsToDelete.length > 0) {
        const ids = logsToDelete.map(l => l.id);
        await supabase.from('activity_logs').delete().in('id', ids);
      }

    } catch (e) {
      console.warn("Silent failure on logging", e);
    }
  }

  async fetchGlobalActivityLogs(): Promise<ActivityLog[]> {
    // On récupère une liste globale pour l'admin, triée par date
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    
    if (error) return [];
    return data as ActivityLog[];
  }

  async fetchPasswordResetRequests(): Promise<PasswordResetRequest[]> {
    const { data, error } = await supabase.from('password_reset_requests').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) return [];
    return data as PasswordResetRequest[];
  }

  async getMaintenanceStatus(): Promise<SystemMaintenance> {
    const { data } = await supabase.from('activity_logs').select('details').eq('target', 'system_maintenance').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!data) return { enabled: false, message: '' };
    try { return JSON.parse(data.details); } catch { return { enabled: false, message: '' }; }
  }

  async setMaintenanceStatus(status: SystemMaintenance) {
    await this.logActivity('update', 'system_maintenance', JSON.stringify(status));
  }

  async sendGlobalNotification(title: string, message: string, type: 'info' | 'warning' | 'error' | 'success') {
    const { data: users } = await supabase.from('parametres').select('user_id');
    if (!users) return;
    const notifications = users.map(u => ({ user_id: u.user_id, title, message, type, read: false }));
    await supabase.from('notifications').insert(notifications);
  }

  async fetchData<T>(table: string): Promise<T[]> {
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    if (error) return [];
    return (data || []) as T[];
  }

  async postData<T>(table: string, item: any): Promise<T> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Session expirée.");
    const { data, error } = await supabase.from(table).insert([{ ...item, user_id: user.id }]).select();
    if (error) throw error;
    
    // Log seulement si ce n'est pas un log interne pour éviter la récursion infinie
    if (table !== 'activity_logs') {
        this.logActivity('create', table.replace('_', ''), `ID: ${data[0].id}`);
    }
    
    if (table === 'rendez_vous') {
      const settings = await this.getSettings();
      if (settings?.google_calendar_enabled) await this.syncWithGoogleCalendar(data[0] as RendezVous, 'create');
    }
    return data[0] as T;
  }

  async updateData(table: string, id: string, updates: any) {
    const { error } = await supabase.from(table).update(updates).eq('id', id);
    if (error) throw error;

    this.logActivity('update', table.replace('_', ''), `ID: ${id}`);

    if (table === 'rendez_vous') {
      const { data } = await supabase.from('rendez_vous').select('*').eq('id', id).single();
      const settings = await this.getSettings();
      if (data && settings?.google_calendar_enabled) await this.syncWithGoogleCalendar(data, 'update');
    }
  }

  async deleteData(table: string, id: string) {
    if (table === 'rendez_vous') {
      const { data } = await supabase.from('rendez_vous').select('*').eq('id', id).single();
      const settings = await this.getSettings();
      if (data && data.google_event_id && settings?.google_calendar_enabled) await this.syncWithGoogleCalendar(data, 'delete');
    }

    this.logActivity('delete', table.replace('_', ''), `ID: ${id}`);

    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  async fetchPublicQuote(id: string): Promise<{ devis: Devis, client: Client, vehicule: Vehicule, settings: GarageSettings } | null> {
    const { data: devis } = await supabase.from('devis').select('*').eq('id', id).single();
    if (!devis) throw new Error("Devis introuvable.");
    const { data: client } = await supabase.from('clients').select('*').eq('id', devis.client_id).single();
    const { data: vehicule } = await supabase.from('vehicules').select('*').eq('id', devis.vehicule_id).single();
    const { data: settings } = await supabase.from('parametres').select('*').eq('user_id', devis.user_id).single();
    return { devis, client, vehicule, settings };
  }

  async signQuote(id: string, metadata: SignatureMetadata, status: 'accepte' | 'refuse') {
    await supabase.from('devis').update({ statut: status, signature_metadata: metadata }).eq('id', id);
    const { data: devis } = await supabase.from('devis').select('user_id, numero_devis').eq('id', id).single();
    if (devis) {
      await supabase.from('notifications').insert([{ user_id: devis.user_id, type: status === 'accepte' ? 'success' : 'error', title: status === 'accepte' ? 'Devis Signé !' : 'Devis Refusé', message: `Devis ${devis.numero_devis}`, read: false }]);
      await this.addQuoteHistory({ devis_id: id, user_id: devis.user_id, action: 'signed', details: `Client: ${status}` });
    }
  }

  async shortenUrl(longUrl: string): Promise<string> {
    try {
      const response = await fetch(`https://da.gd/s?url=${encodeURIComponent(longUrl)}`);
      if (response.ok) {
        const text = await response.text();
        if (text.trim().startsWith('http')) return text.trim();
      }
      return longUrl;
    } catch { return longUrl; }
  }

  async uploadDocument(fileName: string, fileBlob: Blob): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non connecté");
    const filePath = `${user.id}/${fileName}`;
    await supabase.storage.from('documents').upload(filePath, fileBlob, { contentType: 'application/pdf', upsert: true });
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath, { download: true });
    return data.publicUrl;
  }

  async syncAllUpcomingToGoogle() {
    const token = this.getStoredGoogleToken();
    if (!token) throw new Error("Non connecté à Google");
    const today = new Date().toISOString().split('T')[0];
    const { data: rdvs } = await supabase.from('rendez_vous').select('*').gte('date', today).is('google_event_id', null).neq('statut', 'annule');
    if (!rdvs) return 0;
    let success = 0;
    for (const rdv of rdvs) { if (await this.syncWithGoogleCalendar(rdv, 'create')) success++; }
    return success;
  }

  async syncWithGoogleCalendar(rdv: RendezVous, action: 'create' | 'update' | 'delete'): Promise<boolean> {
    const token = this.getStoredGoogleToken();
    if (!token) return false;
    try {
      const [y, m, d] = rdv.date.split('-').map(Number);
      const [h, min] = rdv.heure.split(':').map(Number);
      const start = new Date(y, m - 1, d, h, min).toISOString();
      const end = new Date(new Date(start).getTime() + 3600000).toISOString();
      const event = { summary: `Atelier: ${rdv.type_intervention}`, start: { dateTime: start, timeZone: 'UTC' }, end: { dateTime: end, timeZone: 'UTC' } };
      let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
      let method = 'POST';
      if (action !== 'create' && rdv.google_event_id) { url += `/${rdv.google_event_id}`; method = action === 'delete' ? 'DELETE' : 'PATCH'; }
      const res = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: action !== 'delete' ? JSON.stringify(event) : null });
      if (action === 'create' && res.ok) { const data = await res.json(); await supabase.from('rendez_vous').update({ google_event_id: data.id }).eq('id', rdv.id); }
      return res.ok;
    } catch { return false; }
  }

  async getSettings(): Promise<GarageSettings | null> {
    const { data } = await supabase.from('parametres').select('*').maybeSingle();
    return data as GarageSettings;
  }

  async saveSettings(settings: Partial<GarageSettings>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Session expirée.");
    const { data, error } = await supabase.from('parametres').upsert({ ...settings, user_id: user.id }, { onConflict: 'user_id' }).select();
    if (error) throw error;
    return data[0];
  }

  async fetchQuoteHistory(devisId: string): Promise<QuoteHistory[]> {
    const { data } = await supabase.from('devis_history').select('*').eq('devis_id', devisId).order('created_at', { ascending: false });
    return (data || []) as QuoteHistory[];
  }

  async addQuoteHistory(history: Omit<QuoteHistory, 'id' | 'created_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('devis_history').insert([{ ...history, user_id: user.id }]);
  }

  async fetchStockHistory(itemId: string): Promise<StockHistory[]> {
    const { data } = await supabase.from('stock_history').select('*').eq('item_id', itemId).order('created_at', { ascending: false });
    return (data || []) as StockHistory[];
  }

  async addStockHistory(history: Omit<StockHistory, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('stock_history').insert([{ ...history, user_id: user.id }]);
  }

  async fetchNotifications(): Promise<Notification[]> {
    const { data } = await supabase.from('notifications')
      .select('*')
      .neq('title', 'SYSTEM_ACCOUNT_SUSPENDED')
      .order('created_at', { ascending: false })
      .limit(20);
    return (data || []) as Notification[];
  }

  async markNotificationAsRead(id: string) { await supabase.from('notifications').update({ read: true }).eq('id', id); }
  async deleteNotification(id: string) { await supabase.from('notifications').delete().eq('id', id); }
  async markAllNotificationsAsRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
  }

  async getAiUsageCount(userId: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase.from('ai_usage_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId).gt('created_at', oneHourAgo);
    return count || 0;
  }

  async logAiUsage(userId: string) { await supabase.from('ai_usage_logs').insert([{ user_id: userId }]); }

  async login(email: string, pass: string) {
    const res = await supabase.auth.signInWithPassword({ email, password: pass });
    if (res.data.session) this.logActivity('login', 'system', 'Connexion');
    return res;
  }

  async checkSuspensionStatus(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('title', 'SYSTEM_ACCOUNT_SUSPENDED')
      .maybeSingle();
    return !!data;
  }

  async toggleUserSuspension(userId: string, shouldSuspend: boolean) {
    if (shouldSuspend) {
      await supabase.from('notifications').insert([{
        user_id: userId,
        title: 'SYSTEM_ACCOUNT_SUSPENDED',
        message: 'Accès restreint par l\'administration.',
        type: 'error',
        read: false
      }]);
    } else {
      await supabase.from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('title', 'SYSTEM_ACCOUNT_SUSPENDED');
    }
  }

  async requestPasswordReset(email: string) {
    const { data } = await supabase.from('garages_accounts').select('*').eq('email', email).maybeSingle();
    if (!data) throw new Error("Compte inconnu.");
    await supabase.from('password_reset_requests').insert([{ email, user_agent: navigator.userAgent }]);
    const temp = Math.random().toString(36).slice(-8) + '!A1';
    await sendResetPasswordEmail(email, temp);
    return true;
  }

  async updatePassword(newPassword: string) { await supabase.auth.updateUser({ password: newPassword, data: { needs_password_change: false } }); }
  
  async checkStatus(email: string) {
    // Legacy support, now using checkSuspensionStatus via ID in App.tsx
    return 'Actif';
  }

  async inviteUser(email: string, role: UserRole) {
    const temp = Math.random().toString(36).slice(-8) + '!A1';
    const { data, error } = await inviteClient.auth.signUp({ email, password: temp, options: { data: { role, needs_password_change: true, garage_name: 'Nouveau Garage' } } });
    if (error) throw error;
    await sendInvitationEmail(email, role, temp);
    return { user: data.user, tempPassword: temp };
  }

  async fetchInvitations() { 
    const { data: accounts, error } = await supabase.from('garages_accounts').select('*').order('created_at', { ascending: false }); 
    if (error) throw error;
    
    // On récupère tous les IDs suspendus pour marquer la liste
    const { data: suspendedNotifs } = await supabase.from('notifications').select('user_id').eq('title', 'SYSTEM_ACCOUNT_SUSPENDED');
    const suspendedIds = new Set(suspendedNotifs?.map(n => n.user_id) || []);

    return (accounts || []).map(acc => ({
      ...acc,
      status: suspendedIds.has(acc.id) ? 'Suspendu' : 'Actif'
    }));
  }
  
  async deleteGarageAccount(email: string) { 
    const { error } = await supabase.rpc('admin_delete_user_by_email', { target_email: email });
    if (error) throw error;
    this.logActivity('delete', 'system', `Garage supprimé: ${email}`);
  }
}

export const api = new ApiService();
