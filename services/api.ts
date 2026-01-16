
import { createClient } from '@supabase/supabase-js';
import { Client, Vehicule, RendezVous, Mecanicien, StockItem, GarageSettings, Devis, Facture, UserRole, Notification, StockHistory, SignatureMetadata, QuoteHistory } from '../types';
import { sendInvitationEmail } from './emailService';

const supabaseUrl = 'https://qvyqptiekeunidxdomne.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2eXFwdGlla2V1bmlkeGRvbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzUwODAsImV4cCI6MjA4MTYxMTA4MH0.gIpXpTSt3wIWhUmipuy53a1j_JeLh5rRI1gpkXVu-EA';

// Client principal
export const supabase = createClient(supabaseUrl, supabaseKey);

// Client secondaire ISOLÉ pour les invitations
const inviteClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
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

  // --- PUBLIC METHODS FOR QUOTE SIGNING ---
  async fetchPublicQuote(id: string): Promise<{ devis: Devis, client: Client, vehicule: Vehicule, settings: GarageSettings } | null> {
    const { data: devis, error: dErr } = await supabase.from('devis').select('*').eq('id', id).single();
    if (dErr || !devis) throw new Error("Devis introuvable ou expiré.");

    const { data: client } = await supabase.from('clients').select('*').eq('id', devis.client_id).single();
    const { data: vehicule } = await supabase.from('vehicules').select('*').eq('id', devis.vehicule_id).single();
    const { data: settings } = await supabase.from('parametres').select('*').eq('user_id', devis.user_id).single();

    return { 
      devis: devis as Devis, 
      client: client as Client, 
      vehicule: vehicule as Vehicule, 
      settings: settings as GarageSettings 
    };
  }

  async signQuote(id: string, metadata: SignatureMetadata, status: 'accepte' | 'refuse') {
    const { error } = await supabase
      .from('devis')
      .update({ 
        statut: status, 
        signature_metadata: metadata 
      })
      .eq('id', id);

    if (error) throw error;

    const { data: devis } = await supabase.from('devis').select('user_id, numero_devis').eq('id', id).single();
    
    if (devis) {
        const title = status === 'accepte' ? 'Devis Accepté ! 🎉' : 'Devis Refusé';
        const msg = status === 'accepte' 
            ? `Le client a validé et signé le devis ${devis.numero_devis}. Vous pouvez planifier l'intervention.`
            : `Le client a refusé le devis ${devis.numero_devis}.`;

        await supabase.from('notifications').insert([{
            user_id: devis.user_id,
            type: status === 'accepte' ? 'success' : 'error',
            title: title,
            message: msg,
            read: false
        }]);

        await this.addQuoteHistory({
            user_id: devis.user_id,
            devis_id: id,
            action: 'signed',
            details: `Devis ${status === 'accepte' ? 'accepté et signé' : 'refusé'} par le client.`
        });
    }
  }
  // ----------------------------------------

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
    // Gestion spécifique Suppression RDV (Google Calendar)
    if (table === 'rendez_vous') {
      const { data } = await supabase.from('rendez_vous').select('*').eq('id', id).single();
      const settings = await this.getSettings();
      if (data && data.google_event_id && settings?.google_calendar_enabled) {
        await this.syncWithGoogleCalendar(data, 'delete');
      }
    }

    // Gestion suppression en cascade logicielle pour les Devis (au cas où la BDD n'a pas la contrainte)
    if (table === 'devis') {
       try {
         await supabase.from('devis_history').delete().eq('devis_id', id);
       } catch (e) {
         console.warn("Cascade logicielle historique échouée (probablement gérée par la DB)", e);
       }
    }

    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  async shortenUrl(longUrl: string): Promise<string> {
    try {
      const response = await fetch(`https://da.gd/s?url=${encodeURIComponent(longUrl)}`);
      if (response.ok) {
        const text = await response.text();
        const shortUrl = text.trim();
        if (shortUrl.startsWith('http')) return shortUrl;
      }
      return longUrl;
    } catch (e) {
      console.warn("Erreur raccourcisseur, fallback sur URL directe:", e);
      return longUrl;
    }
  }

  async uploadDocument(fileName: string, fileBlob: Blob): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Utilisateur non connecté");

    const filePath = `${user.id}/${fileName}`;

    const { error } = await supabase.storage
      .from('documents')
      .upload(filePath, fileBlob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (error) {
      console.error("Erreur Upload Supabase:", error);
      throw new Error("Erreur lors de l'envoi du fichier vers le cloud.");
    }

    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath, { download: true });

    return data.publicUrl;
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
      const dateParts = rdv.date.split('-');
      const timeParts = rdv.heure.split(':');
      
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const day = parseInt(dateParts[2]);
      const hours = parseInt(timeParts[0]);
      const minutes = parseInt(timeParts[1]) || 0;
      
      const startDateTime = new Date(year, month, day, hours, minutes, 0);
      
      if (isNaN(startDateTime.getTime())) {
          return false;
      }

      let durationInMs = 60 * 60 * 1000;
      const durationValue = parseInt(rdv.duree);
      if (rdv.duree.includes('m')) durationInMs = durationValue * 60 * 1000;
      else if (rdv.duree.includes('h')) durationInMs = durationValue * 60 * 60 * 1000;
      
      const endDateTime = new Date(startDateTime.getTime() + durationInMs);

      let clientName = 'Client';
      let vehicleInfo = '';

      if (action !== 'delete') {
        const { data: client } = await supabase.from('clients').select('nom, prenom').eq('id', rdv.client_id).single();
        if (client) clientName = `${client.nom} ${client.prenom}`;

        if (rdv.vehicule_id) {
          const { data: vehicule } = await supabase.from('vehicules').select('marque, modele, immatriculation').eq('id', rdv.vehicule_id).single();
          if (vehicule) vehicleInfo = `${vehicule.marque} ${vehicule.modele} (${vehicule.immatriculation})`;
        }
      }

      const summary = `📅 ${clientName} : ${rdv.type_intervention}${vehicleInfo ? ` (${vehicleInfo})` : ''}`;

      const description = `
Véhicule: ${vehicleInfo || 'Non spécifié'}
Notes: ${rdv.description || 'Aucune note'}
-------------------
Géré via GaragePro SaaS
      `.trim();

      const event = {
        summary: summary,
        description: description,
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
          console.warn("Erreur API Google:", await res.text());
          return false;
      }

      if (action === 'create') {
        const data = await res.json();
        await supabase
            .from('rendez_vous')
            .update({ google_event_id: data.id })
            .eq('id', rdv.id);
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

  // --- Quote History (Avec Limitation automatique à 5) ---
  async fetchQuoteHistory(devisId: string): Promise<QuoteHistory[]> {
    const { data, error } = await supabase
      .from('devis_history')
      .select('*')
      .eq('devis_id', devisId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data as QuoteHistory[];
  }

  async addQuoteHistory(history: Omit<QuoteHistory, 'id' | 'created_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // 1. D'abord insérer la nouvelle ligne pour être sûr qu'elle existe
      await supabase.from('devis_history').insert([{ ...history, user_id: user.id }]);

      // 2. Récupérer TOUT l'historique pour ce devis, du plus récent au plus vieux
      const { data: allHistory } = await supabase
        .from('devis_history')
        .select('id')
        .eq('devis_id', history.devis_id)
        .order('created_at', { ascending: false }); // Le plus récent en premier (index 0)

      // 3. Si on dépasse 5 lignes
      if (allHistory && allHistory.length > 5) {
         // On garde les index 0,1,2,3,4 (5 items). On supprime à partir de l'index 5.
         const idsToDelete = allHistory.slice(5).map(h => h.id);
         
         if (idsToDelete.length > 0) {
             const { error } = await supabase.from('devis_history').delete().in('id', idsToDelete);
             if (error) console.error("Erreur nettoyage historique (RLS manquant ?):", error.message);
         }
      }
    }
  }

  // --- Stock History ---
  async fetchStockHistory(itemId: string): Promise<StockHistory[]> {
    const { data, error } = await supabase
      .from('stock_history')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data as StockHistory[];
  }

  async addStockHistory(history: Omit<StockHistory, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('stock_history').insert([{ ...history, user_id: user.id }]);
    }
  }

  // --- Notifications ---
  async fetchNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.warn("Fetch Notifications:", error.message);
      return [];
    }
    return data as Notification[];
  }

  async markNotificationAsRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  }

  async deleteNotification(id: string) {
    await supabase.from('notifications').delete().eq('id', id);
  }

  async markAllNotificationsAsRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
    }
  }

  async getAiUsageCount(userId: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase.from('ai_usage_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId).gt('created_at', oneHourAgo);
    if (error) return 0;
    return count || 0;
  }

  async logAiUsage(userId: string) {
    await supabase.from('ai_usage_logs').insert([{ user_id: userId }]);
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
  
  async inviteUser(email: string, role: UserRole) {
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + '!';
    const { data, error } = await inviteClient.auth.signUp({ email, password: tempPassword, options: { data: { role: role, needs_password_change: true, garage_name: 'Nouveau Garage' } } });
    if (error) throw error;
    await supabase.from('invitations').insert([{ email, role, status: 'Actif' }]);
    try { await sendInvitationEmail(email, role, tempPassword); } catch (e: any) { throw new Error(`Compte créé (Mdp: ${tempPassword}), mais erreur email: ${e.message}`); }
    return { user: data.user, tempPassword };
  }

  async fetchInvitations() { const { data } = await supabase.from('invitations').select('*').order('created_at', { ascending: false }); return data || []; }
  async updateInvitationStatus(id: string, newStatus: string) { await supabase.from('invitations').update({ status: newStatus }).eq('id', id); }
  async deleteGarageAccount(id: string) { await supabase.from('invitations').delete().eq('id', id); }
}

export const api = new ApiService();
