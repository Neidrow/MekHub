
export type UserRole = 'super_admin' | 'user_basic' | 'user_premium';

export interface User {
  id: string;
  email: string;
  garageName: string;
  role: UserRole;
  subscription_status: 'active' | 'trial' | 'expired';
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
  logo_url?: string;
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
  specialite: string;
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

export interface StockMovement {
  id: string;
  user_id: string;
  article_id: string;
  type_mouvement: 'entree' | 'sortie';
  quantite: number;
  date_mouvement: string;
  statut: string;
  motif: string;
  rdv_id?: string;
  facture_id?: string;
  created_at: string;
}

export interface DevisItem {
  description: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
}

export interface Devis {
  id: string;
  user_id: string;
  numero_devis: string;
  client_id: string;
  vehicule_id: string;
  date_devis: string;
  items: DevisItem[];
  montant_ht: number;
  tva: number;
  montant_ttc: number;
  statut: 'brouillon' | 'envoye' | 'accepte' | 'refuse';
  notes: string;
  created_at?: string;
}

export interface Facture {
  id: string;
  user_id: string;
  numero_facture: string;
  client_id: string;
  vehicule_id: string;
  date_facture: string;
  items: any[];
  montant_ht: number;
  tva: number;
  montant_ttc: number;
  acompte: number;
  montant_paye: number;
  statut: 'non_payee' | 'partiellement_payee' | 'payee' | 'en_retard';
  notes: string;
  created_at?: string;
}

export type ViewState = 'dashboard' | 'appointments' | 'customers' | 'vehicles' | 'mechanics' | 'quotes' | 'invoices' | 'inventory' | 'ai-assistant' | 'settings' | 'super-admin';
