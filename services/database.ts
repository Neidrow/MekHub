
/**
 * Database Service (Backend Simulation)
 * Gère l'isolation des données par utilisateur et la persistance.
 */

class DatabaseService {
  private userId: string;

  constructor() {
    // On simule un ID utilisateur unique pour cet utilisateur
    let id = localStorage.getItem('gp_user_session');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('gp_user_session', id);
    }
    this.userId = id;
  }

  private getKey(collection: string) {
    return `gp_${this.userId}_${collection}`;
  }

  getAll<T>(collection: string): T[] {
    const data = localStorage.getItem(this.getKey(collection));
    return data ? JSON.parse(data) : [];
  }

  saveAll<T>(collection: string, data: T[]) {
    localStorage.setItem(this.getKey(collection), JSON.stringify(data));
  }

  add<T extends { id: string }>(collection: string, item: T) {
    const all = this.getAll<T>(collection);
    all.unshift(item);
    this.saveAll(collection, all);
    return item;
  }

  update<T extends { id: string }>(collection: string, id: string, updates: Partial<T>) {
    const all = this.getAll<T>(collection);
    const index = all.findIndex(i => i.id === id);
    if (index !== -1) {
      all[index] = { ...all[index], ...updates };
      this.saveAll(collection, all);
    }
  }

  delete(collection: string, id: string) {
    const all = this.getAll<any>(collection);
    const filtered = all.filter(i => i.id !== id);
    this.saveAll(collection, filtered);
  }

  // Initialisation avec des données de démo si vide
  seed() {
    if (this.getAll('customers').length === 0) {
      const demoCustomer = { id: 'c1', name: 'Demo Client', email: 'demo@garage.pro', phone: '0600000000', address: '123 Rue de la Paix', createdAt: new Date().toISOString() };
      this.add('customers', demoCustomer);
      this.add('mechanics', { id: 'm1', name: 'Thomas Expert', specialty: 'Moteurs & Diag', status: 'available' });
      this.add('vehicles', { id: 'v1', customerId: 'c1', make: 'Renault', model: 'Clio IV', year: 2019, vin: 'ABC123XYZ', licensePlate: 'GP-777-PRO' });
    }
  }

  getUserId() { return this.userId; }
}

export const db = new DatabaseService();
db.seed();
