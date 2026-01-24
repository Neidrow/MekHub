
import { createClient } from '@supabase/supabase-js';
import { Client, Vehicule, RendezVous, Mecanicien, StockItem, GarageSettings, Devis, Facture, UserRole, Notification, StockHistory, SignatureMetadata, QuoteHistory, ActivityLog, SystemMaintenance, PasswordResetRequest } from '../types';
import { sendInvitationEmail, sendResetPasswordEmail } from './emailService';

const supabaseUrl = 'https://qvyqptiekeunidxdomne.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2eXFwdGlla2V1bmlkeGRvbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzUwODAsImV4cCI6MjA4MTYxMTA4MH0.gIpXpTSt3wIWhUmipuy53a1j_JeLh5rRI1gpkXVu-EA';

export const supabase = createClient(supabaseUrl, supabaseKey);

const inviteClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const GOOGLE_CLIENT_ID = "575548398550-vlghdffigbstdqmfqeq3grbdbleid0j2.apps.googleusercontent.com";

class ApiService {
  private googleToken: string | null = null;
  private tokenClient: any = null;

  async requestGoogleAccess(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!(window as any).google) {
          reject(new Error("Le script Google n'est pas chargé."));
          return;
        }
        this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar.events',
          callback: (response: any) => {
            if (response.error) reject(new Error(`Erreur Google: ${response.error}`));
            else {
              this.googleToken = response.access_token;
              sessionStorage.setItem('google_access_token', response.access_token);
              resolve(response.access_token);
            }
          },
        });
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err: any) { reject(err); }
    });
  }

  getStoredGoogleToken() { return this.googleToken || sessionStorage.getItem('google_access_token'); }

  async logout() { 
    sessionStorage.removeItem('google_access_token');
    this.googleToken = null;
    await supabase.auth.signOut(); 
  }

  /**
   * NETTOYAGE DES LOGS
   * Supprime tous les logs sauf les 20 plus récents pour optimiser le stockage.
   */
  private async cleanupLogs() {
    try {
      // 1. Récupérer les IDs des 20 plus récents
      const { data: recentLogs } = await supabase
        .from('activity_logs')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!recentLogs || recentLogs.length < 20) return;

      const idsToKeep = recentLogs.map(log => log.id);

      // 2. Supprimer tout ce qui n'est pas dans cette liste
      await supabase
        .from('activity_logs')
        .delete()
        .not('id', 'in', `(${idsToKeep.join(',')})`);
    } catch (e) {
      console.warn("Cleanup logs failed", e);
    }
  }

  async logActivity(action_type: ActivityLog['action_type'], target: string, details: string = '') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const simplifiedDetails = details.length > 100 ? details.substring(0, 97) + '...' : details;

      await supabase.from('activity_logs').insert([{
        user_id: user.id,
        email: user.email,
        action_type,
        target,
        details: simplifiedDetails
      }]);

      // Nettoyage après insertion
      await this.cleanupLogs();
    } catch (e) {
      console.warn("Silent failure on logging to preserve UX", e);
    }
  }

  async fetchGlobalActivityLogs(): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20); // On ne récupère que les 20 derniers
    
    if (error) return [];
    return data as ActivityLog[];
  }

  async fetchPasswordResetRequests(): Promise<PasswordResetRequest[]> {
    const { data, error } = await supabase.from('password_reset_requests').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) return [];
    return data as PasswordResetRequest[];
  }

  async getMaintenanceStatus(): Promise<SystemMaintenance> {
    const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'maintenance').single();
    if (error || !data) return { enabled: false, message: '' };
    return data.value as SystemMaintenance;
  }

  async setMaintenanceStatus(status: SystemMaintenance) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Accès refusé");
    const { error } = await supabase.from('system_settings').update({ value: status, updated_at: new Date().toISOString(), updated_by: user.id }).eq('key', 'maintenance');
    if (error) throw error;
    this.logActivity('update', 'system', `Maintenance ${status.enabled ? 'ON' : 'OFF'}`);
  }

  async sendGlobalNotification(title: string, message: string, type: 'info' | 'warning' | 'error' | 'success') {
    const { data: users, error } = await supabase.from('parametres').select('user_id');
    if (error || !users) return;
    const notifications = users.map(u => ({ user_id: u.user_id, title, message, type, read: false }));
    await supabase.from('notifications').insert(notifications);
    this.logActivity('create', 'broadcast', `Notif groupée: ${title}`);
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
    
    this.logActivity('create', table.replace('_', ''), `ID: ${data[0].id}`);
    
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
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20);
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

  async signup(email: string, pass: string, garage: string) {
    return await supabase.auth.signUp({ email, password: pass, options: { data: { garage_name: garage, role: 'user_basic' } } });
  }

  async requestPasswordReset(email: string) {
    const { data } = await supabase.from('invitations').select('*').eq('email', email).maybeSingle();
    if (!data) throw new Error("Compte inconnu.");
    await supabase.from('password_reset_requests').insert([{ email, user_agent: navigator.userAgent }]);
    const temp = Math.random().toString(36).slice(-8) + '!A1';
    await sendResetPasswordEmail(email, temp);
    return true;
  }

  async updatePassword(newPassword: string) { await supabase.auth.updateUser({ password: newPassword, data: { needs_password_change: false } }); }
  async checkStatus(email: string) {
    const { data } = await supabase.from('invitations').select('status').eq('email', email).maybeSingle();
    return data?.status || 'Inexistant';
  }

  async inviteUser(email: string, role: UserRole) {
    const temp = Math.random().toString(36).slice(-8) + '!A1';
    const { data, error } = await inviteClient.auth.signUp({ email, password: temp, options: { data: { role, needs_password_change: true, garage_name: 'Nouveau Garage' } } });
    if (error) throw error;
    await supabase.from('invitations').insert([{ email, role, status: 'Actif' }]);
    await sendInvitationEmail(email, role, temp);
    return { user: data.user, tempPassword: temp };
  }

  async fetchInvitations() { const { data } = await supabase.from('invitations').select('*').order('created_at', { ascending: false }); return data || []; }
  async updateInvitationStatus(id: string, newStatus: string) { await supabase.from('invitations').update({ status: newStatus }).eq('id', id); }
  async deleteGarageAccount(id: string) { await supabase.from('invitations').delete().eq('id', id); }
}

export const api = new ApiService();
