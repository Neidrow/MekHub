
import { createClient } from '@supabase/supabase-js';
import { Client, Vehicule, RendezVous, Mecanicien, StockItem, GarageSettings, Devis, Facture, UserRole } from '../types';

const supabaseUrl = 'https://qvyqptiekeunidxdomne.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2eXFwdGlla2V1bmlkeGRvbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzUwODAsImV4cCI6MjA4MTYxMTA4MH0.gIpXpTSt3wIWhUmipuy53a1j_JeLh5rRI1gpkXVu-EA';

export const supabase = createClient(supabaseUrl, supabaseKey);

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
            if (response.error) {
              reject(new Error(`Erreur Google: ${response.error}`));
            } else {
              this.googleToken = response.access_token;
              sessionStorage.setItem('google_access_token', response.access_token);
              resolve(response.access_token);
            }
          },
        });
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err: any) {
        reject(err);
      }
    });
  }

  getStoredGoogleToken() {
    return this.googleToken || sessionStorage.getItem('google_access_token');
  }

  async logout() { 
    sessionStorage.removeItem('google_access_token');
    this.googleToken = null;
    await supabase.auth.signOut(); 
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

    if (table === 'rendez_vous') {
      const settings = await this.getSettings();
      if (settings?.google_calendar_enabled) {
        await this.syncWithGoogleCalendar(data[0] as RendezVous, 'create');
      }
    }
    return data[0] as T;
  }

  async updateData(table: string, id: string, updates: any) {
    const { error } = await supabase.from(table).update(updates).eq('id', id);
    if (error) throw error;

    if (table === 'rendez_vous') {
      const { data } = await supabase.from('rendez_vous').select('*').eq('id', id).single();
      const settings = await this.getSettings();
      if (data && settings?.google_calendar_enabled) {
        await this.syncWithGoogleCalendar(data, 'update');
      }
    }
  }

  async deleteData(table: string, id: string) {
    if (table === 'rendez_vous') {
      const { data } = await supabase.from('rendez_vous').select('*').eq('id', id).single();
      const settings = await this.getSettings();
      if (data && data.google_event_id && settings?.google_calendar_enabled) {
        await this.syncWithGoogleCalendar(data, 'delete');
      }
    }
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  async syncAllUpcomingToGoogle() {
    const token = this.getStoredGoogleToken();
    if (!token) throw new Error("Veuillez d'abord connecter votre compte Google.");

    const today = new Date().toISOString().split('T')[0];
    const { data: rdvs, error } = await supabase
      .from('rendez_vous')
      .select('*')
      .gte('date', today)
      .is('google_event_id', null)
      .neq('statut', 'annule');

    if (error) throw error;
    if (!rdvs || rdvs.length === 0) return 0;

    let successCount = 0;
    for (const rdv of rdvs) {
      const success = await this.syncWithGoogleCalendar(rdv, 'create');
      if (success) successCount++;
    }
    return successCount;
  }

  async syncWithGoogleCalendar(rdv: RendezVous, action: 'create' | 'update' | 'delete'): Promise<boolean> {
    const token = this.getStoredGoogleToken();
    if (!token) return false;

    try {
      // Parsing sécurisé de la date et de l'heure
      const dateParts = rdv.date.split('-'); // [YYYY, MM, DD]
      const timeParts = rdv.heure.split(':'); // [HH, mm, ss]
      
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // JS months are 0-11
      const day = parseInt(dateParts[2]);
      const hours = parseInt(timeParts[0]);
      const minutes = parseInt(timeParts[1]) || 0;
      
      const startDateTime = new Date(year, month, day, hours, minutes, 0);
      
      if (isNaN(startDateTime.getTime())) {
          console.error("Date ou Heure invalide pour le RDV:", rdv);
          return false;
      }

      let durationInMs = 60 * 60 * 1000;
      const durationValue = parseInt(rdv.duree);
      if (rdv.duree.includes('m')) durationInMs = durationValue * 60 * 1000;
      else if (rdv.duree.includes('h')) durationInMs = durationValue * 60 * 60 * 1000;
      
      const endDateTime = new Date(startDateTime.getTime() + durationInMs);

      // Google attend du ISO8601 (toISOString est parfait si la date est valide)
      const event = {
        summary: `🔧 [${rdv.statut.toUpperCase()}] RDV Garage: ${rdv.type_intervention}`,
        description: `Notes: ${rdv.description || ''}\nStatut: ${rdv.statut}`,
        start: { dateTime: startDateTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: endDateTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      };

      let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
      let method = 'POST';

      if (action === 'update' && rdv.google_event_id) {
        url += `/${rdv.google_event_id}`;
        method = 'PATCH';
      } else if (action === 'delete' && rdv.google_event_id) {
        url += `/${rdv.google_event_id}`;
        method = 'DELETE';
      }

      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: action !== 'delete' ? JSON.stringify(event) : null
      });

      if (!res.ok) {
          const errText = await res.text();
          console.error(`Erreur Google Calendar API (${res.status}):`, errText);
          return false;
      }

      if (action === 'create') {
        const data = await res.json();
        const { error: upError } = await supabase
            .from('rendez_vous')
            .update({ google_event_id: data.id })
            .eq('id', rdv.id);
            
        if (upError) {
            console.error("Impossible de sauvegarder l'ID Google dans Supabase:", upError);
            return false;
        }
      }
      
      return true;
    } catch (e) {
      console.error("Erreur fatale synchronisation Google:", e);
      return false;
    }
  }

  async getSettings(): Promise<GarageSettings | null> {
    const { data } = await supabase.from('parametres').select('*').maybeSingle();
    return data as GarageSettings;
  }

  async saveSettings(settings: Partial<GarageSettings>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Session expirée.");
    const { data, error } = await supabase
      .from('parametres')
      .upsert({ ...settings, user_id: user.id }, { onConflict: 'user_id' })
      .select();
    if (error) throw error;
    return data[0];
  }

  async login(email: string, pass: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return data;
  }
  async signup(email: string, pass: string, garage: string) {
    const { data, error } = await supabase.auth.signUp({ email, password: pass, options: { data: { garage_name: garage, role: 'user_basic' } } });
    if (error) throw error;
    return data;
  }
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword, data: { needs_password_change: false } });
    if (error) throw error;
  }
  async checkStatus(email: string) {
    const { data } = await supabase.from('invitations').select('status').eq('email', email).maybeSingle();
    return data?.status || 'Inexistant';
  }
  async inviteUser(email: string, role: UserRole) { await supabase.from('invitations').insert([{ email, role, status: 'Actif' }]); }
  async fetchInvitations() { const { data } = await supabase.from('invitations').select('*').order('created_at', { ascending: false }); return data || []; }
  async updateInvitationStatus(id: string, newStatus: string) { await supabase.from('invitations').update({ status: newStatus }).eq('id', id); }
  async deleteGarageAccount(id: string) { await supabase.from('invitations').delete().eq('id', id); }
}

export const api = new ApiService();
