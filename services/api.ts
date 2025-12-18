
import { createClient } from '@supabase/supabase-js';
import emailjs from '@emailjs/browser';
import { Client, Vehicule, RendezVous, Mecanicien, StockItem, GarageSettings, Devis, Facture, UserRole } from '../types';

const supabaseUrl = 'https://qvyqptiekeunidxdomne.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2eXFwdGlla2V1bmlkeGRvbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzUwODAsImV4cCI6MjA4MTYxMTA4MH0.gIpXpTSt3wIWhUmipuy53a1j_JeLh5rRI1gpkXVu-EA';

// Client principal pour l'application
export const supabase = createClient(supabaseUrl, supabaseKey);

// Client secondaire ISOLÉ pour les invitations (évite de déconnecter l'admin)
const inviteClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Initialisation EmailJS
emailjs.init("SERB24v_WSISCjApy"); 

class ApiService {
  async signup(email: string, pass: string, garage: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { 
          garage_name: garage,
          full_name: garage,
          role: 'user_basic'
        }
      }
    });
    if (error) throw error;
    return data;
  }

  async inviteUser(email: string, role: UserRole) {
    const tempPassword = Math.random().toString(36).slice(-10);
    
    // Utilisation de inviteClient pour ne pas polluer la session actuelle
    const { data, error } = await inviteClient.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: { 
          role: role,
          needs_password_change: true
        }
      }
    });

    if (error) throw error;
    
    // On envoie le mail après la création réussie
    await this.sendWelcomeEmail(email, tempPassword);
    
    return { user: data.user, tempPassword };
  }

  private async sendWelcomeEmail(toEmail: string, password: string) {
    const templateParams = {
      user_email: toEmail,
      user_password: password,
      app_link: window.location.origin,
      reply_to: 'admin@garagepro.saas'
    };

    try {
      await emailjs.send('service_3mh4mah', 'template_8ksf2hg', templateParams);
    } catch (error) {
      console.error('Email error:', error);
      throw new Error("L'utilisateur a été créé mais l'email d'invitation n'a pas pu être envoyé.");
    }
  }

  async login(email: string, pass: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass
    });
    if (error) throw error;
    return data;
  }

  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { needs_password_change: false }
    });
    if (error) throw error;
    return data;
  }

  async logout() {
    await supabase.auth.signOut();
  }

  async fetchData<T>(table: string): Promise<T[]> {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) return [];
    return (data || []) as T[];
  }

  async postData<T>(table: string, item: any): Promise<T> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Session expirée.");

    const { data, error } = await supabase
      .from(table)
      .insert([{ ...item, user_id: user.id }])
      .select();

    if (error) throw error;
    return data[0] as T;
  }

  async saveSettings(settings: Partial<GarageSettings>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Session expirée.");

    const { data, error } = await supabase
      .from('parametres')
      .upsert({ ...settings, user_id: user.id })
      .select();

    if (error) throw error;
    return data[0];
  }

  async getSettings(): Promise<GarageSettings | null> {
    const { data, error } = await supabase
      .from('parametres')
      .select('*')
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') return null;
    return data as GarageSettings;
  }
}

export const api = new ApiService();
