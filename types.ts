
export type UserRole = 'super_admin' | 'user_basic' | 'user_premium';

export interface User {
  id: string;
  email: string;
  garageName: string;
  role: UserRole;
  subscription_status: 'active' | 'trial' | 'expired';
}

export interface ActivityLog {
  id: string;
  user_id: string;
  email: string;
  action_type: 'login' | 'navigation' | 'create' | 'delete' | 'update';
  target: string;
  details?: string;
  created_at: string;
}

export interface PasswordResetRequest {
  id: string;
  email: string;
  user_agent: string;
  created_at: string;
  status: string;
}

export interface SystemMaintenance {
  enabled: boolean;
  message: string;
}

export interface GarageSettings {
  id: string;
  user_id: string;
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  siret: string;
  tva: number;
  tva_intracom?: string;
  conditions_paiement?: string;
  penalites_retard?: string;
  validite_devis?: number;
  logo_url?: string;
  google_calendar_enabled?: boolean;
  google_prompt_dismissed?: boolean;
}

export interface Client {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse: string;
  notes: string;
  created_at?: string;
}

export interface Vehicule {
  id: string;
  user_id: string;
  client_id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  annee: number;
  couleur: string;
  kilometrage: number;
  vin: string;
  created_at?: string;
}

export type MechanicStatus = 'disponible' | 'en_intervention' | 'absent';

export interface Mecanicien {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  statut: MechanicStatus;
  created_at?: string;
}

export interface RendezVous {
  id: string;
  user_id: string;
  client_id: string;
  vehicule_id: string;
  mecanicien_id?: string;
  date: string;
  heure: string;
  duree: string;
  type_intervention: string;
  description: string;
  statut: 'en_attente' | 'en_cours' | 'termine' | 'annule';
  notes: string;
  google_event_id?: string;
  created_at?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SignatureMetadata {
  signed_by: string;
  signed_at: string;
  ip_address: string;
  user_agent: string;
  consent_text: string;
}

export interface Devis {
  id: string;
  user_id: string;
  client_id: string;
  vehicule_id: string;
  numero_devis: string;
  date_devis: string;
  items: InvoiceItem[];
  montant_ht: number;
  montant_ttc: number;
  statut: 'brouillon' | 'en_attente' | 'accepte' | 'refuse';
  notes?: string;
  signature_metadata?: SignatureMetadata; // Nouveau champ pour la preuve technique
  created_at?: string;
}

export interface QuoteHistory {
  id: string;
  devis_id: string;
  user_id: string;
  action: string; // 'creation', 'modification', 'status_change', 'email_sent', 'signed'
  details: string;
  created_at: string;
}

export interface Facture {
  id: string;
  user_id: string;
  client_id: string;
  vehicule_id: string;
  numero_facture: string;
  date_facture: string;
  items: InvoiceItem[];
  montant_ht: number;
  tva: number;
  montant_ttc: number;
  acompte: number;
  montant_paye: number;
  statut: 'brouillon' | 'payee' | 'non_payee' | 'annule';
  notes?: string;
  created_at?: string;
}

export interface StockItem {
  id: string;
  user_id: string;
  reference: string;
  nom: string;
  categorie: string;
  quantite: number;
  seuil_alerte: number;
  prix_achat: number;
  prix_vente: number;
  fournisseur: string;
  notes: string;
  created_at?: string;
}

export interface StockHistory {
  id: string;
  item_id: string;
  change_amount: number;
  new_quantity: number;
  reason: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  read: boolean;
  created_at?: string;
  isLocal?: boolean;
  link?: ViewState;
}

export type ViewState = 
  | 'dashboard' 
  | 'appointments' 
  | 'customers' 
  | 'vehicles' 
  | 'mechanics' 
  | 'quotes' 
  | 'invoices' 
  | 'inventory' 
  | 'statistics'
  | 'ai-assistant' 
  | 'settings' 
  | 'super-admin-overview'  // Admin Home
  | 'super-admin-garages'   // Admin Users
  | 'super-admin-logs'      // Admin Logs
  | 'super-admin-communication' // Admin Messages & Maintenance
  | 'public_quote';
