
import { createClient } from '@supabase/supabase-js';
import { Client, Vehicule, RendezVous, Mecanicien, StockItem, GarageSettings, Devis, Facture, UserRole } from '../types';

const supabaseUrl = 'https://qvyqptiekeunidxdomne.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2eXFwdGlla2V1bmlkeGRvbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzUwODAsImV4cCI6MjA4MTYxMTA4MH0.gIpXpTSt3wIWhUmipuy53a1j_JeLh5rRI1gpkXVu-EA';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ID Client Google réel fourni par l'utilisateur
const GOOGLE_CLIENT_ID = "575548398550-vlghdffigbstdqmfqeq3grbdbleid0j2.apps.googleusercontent.com";

class ApiService {
  private googleToken: string | null = null;
  private tokenClient: any = null;

  // AUTH GOOGLE - Demande de permission réelle
  async requestGoogleAccess(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!(window as any).google) {
          reject(new Error("Le script Google n'est pas encore chargé. Veuillez patienter ou rafraîchir la page."));
          return;
        }

        this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar.events',
          callback: (response: any) => {
            if (response.error) {
              console.error("Erreur OAuth Google 상세:", response);
              reject(new Error(`L'autorisation Google a échoué: ${response.error_description || response.error}`));
            } else {
              this.googleToken = response.access_token;
              sessionStorage.setItem('google_access_token', response.access_token);
              resolve(response.access_token);
            }
          },
        });

        // Déclencher la demande de token
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        console.error("Erreur d'initialisation Google OAuth:", err);
        reject(new Error("Erreur système lors de la connexion Google."));
      }
    });
  }

  getStoredGoogleToken() {
    return this.googleToken || sessionStorage.getItem('google_access_token');
  }

  // CORE DATA
  async signup(email: string, pass: string, garage: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { garage_name: garage, role: 'user_basic', needs_password_change: false } }
    });
    if (error) throw error;
    return data;
  }

  async login(email: string, pass: string) {
    const status = await this.checkStatus(email);
    if (status === 'Suspendu') throw new Error("Accès suspendu.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return data;
  }

  async logout() { 
    sessionStorage.removeItem('google_access_token');
    this.googleToken = null;
    await supabase.auth.signOut(); 
  }

  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword, data: { needs_password_change: false } });
    if (error) throw error;
    return data;
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

  // GOOGLE CALENDAR SYNC
  async syncWithGoogleCalendar(rdv: RendezVous, action: 'create' | 'update' | 'delete') {
    let token = this.getStoredGoogleToken();
    
    if (!token) {
      console.warn("Pas de token Google valide pour la synchronisation.");
      return;
    }

    try {
      const startTime = new Date(`${rdv.date}T${rdv.heure}:00`).toISOString();
      const durationHours = parseInt(rdv.duree.replace('h', '')) || 1;
      const endTime = new Date(new Date(startTime).getTime() + durationHours * 60 * 60 * 1000).toISOString();

      const event = {
        summary: `🔧 RDV GaragePro: ${rdv.type_intervention}`,
        description: `${rdv.description || ''}\n\nNotes: ${rdv.notes || ''}\nStatut: ${rdv.statut.toUpperCase()}`,
        start: { dateTime: startTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: endTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'email', minutes: 60 },
          ],
        },
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
        const errorData = await res.json();
        if (res.status === 401) {
          sessionStorage.removeItem('google_access_token');
          this.googleToken = null;
        }
        throw new Error(`Erreur API Google: ${errorData.error?.message || res.statusText}`);
      }

      if (res.ok && action === 'create') {
        const data = await res.json();
        await supabase.from('rendez_vous').update({ google_event_id: data.id }).eq('id', rdv.id);
      }
    } catch (e) {
      console.error("Échec de la synchronisation Google Calendar:", e);
    }
  }

  // SETTINGS
  async getSettings(): Promise<GarageSettings | null> {
    const { data } = await supabase.from('parametres').select('*').maybeSingle();
    return data as GarageSettings;
  }

  async saveSettings(settings: Partial<GarageSettings>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Session expirée.");
    const { data, error } = await supabase.from('parametres').upsert({ ...settings, user_id: user.id }).select();
    if (error) throw error;
    return data[0];
  }

  async checkStatus(email: string) {
    const { data } = await supabase.from('invitations').select('status').eq('email', email).maybeSingle();
    return data?.status || 'Inexistant';
  }

  async inviteUser(email: string, role: UserRole) {
    await supabase.from('invitations').insert([{ email, role, status: 'Actif' }]);
  }

  async fetchInvitations() {
    const { data } = await supabase.from('invitations').select('*').order('created_at', { ascending: false });
    return data || [];
  }

  async updateInvitationStatus(id: string, newStatus: string) {
    await supabase.from('invitations').update({ status: newStatus }).eq('id', id);
  }

  async deleteGarageAccount(id: string) {
    await supabase.from('invitations').delete().eq('id', id);
  }
}

export const api = new ApiService();
