
import { createClient } from '@supabase/supabase-js';
import emailjs from '@emailjs/browser';
import { Client, Vehicule, RendezVous, Mecanicien, StockItem, GarageSettings, Devis, Facture, UserRole } from '../types';

const supabaseUrl = 'https://qvyqptiekeunidxdomne.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2eXFwdGlla2V1bmlkeGRvbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzUwODAsImV4cCI6MjA4MTYxMTA4MH0.gIpXpTSt3wIWhUmipuy53a1j_JeLh5rRI1gpkXVu-EA';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Initialisation EmailJS - Remplace par TA clé publique
emailjs.init("YOUR_PUBLIC_KEY"); 

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
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: { 
          role: role,
          needs_password_change: true,
          temp_password_hint: tempPassword
        }
      }
    });

    if (error) throw error;
    
    // Envoi réel du mail via EmailJS
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
      // Remplace par TES IDs de service et template
      await emailjs.send(
        'YOUR_SERVICE_ID', 
        'YOUR_TEMPLATE_ID', 
        templateParams
      );
      console.log('Email de bienvenue envoyé avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      throw new Error("L'utilisateur a été créé mais l'email n'a pas pu être envoyé.");
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
    
    if (error) {
      console.error(`Erreur chargement ${table}:`, error.message);
      return [];
    }
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
    
    if (error && error.code !== 'PGRST116') {
      console.error("Erreur settings:", error.message);
      return null;
    }
    return data as GarageSettings;
  }
}

export const api = new ApiService();
