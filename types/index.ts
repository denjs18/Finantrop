export interface User {
  _id: string
  email: string
  nom: string
  createdAt: Date
}

export interface Depense {
  _id?: string
  userId: string
  date: Date
  categorie: DepenseCategorie
  montant: number
  description?: string
}

export type DepenseCategorie =
  | 'loyer'
  | 'electricite_gaz'
  | 'mobile'
  | 'sport'
  | 'voiture_logement'
  | 'courses'
  | 'essence'
  | 'amazon'
  | 'autres'

export interface Transaction {
  _id?: string
  userId: string
  date: Date
  type: 'achat' | 'vente'
  action: string
  quantite: number
  prix: number
  frais: number
}

export interface PortfolioItem {
  _id?: string
  userId: string
  action: string
  quantite: number
  prixMoyenAchat: number
  fraisTotal: number
  prixActuel?: number
}

export interface MoisRecap {
  _id?: string
  userId: string
  mois: number
  annee: number
  totalFrais: number
  salaire: number
  epargneBourse: number
  epargneLivrets: number
  reste: number
}

export interface Settings {
  _id?: string
  userId: string
  salaireMensuel: number
  investissementMoyen: number
  performanceMoyenne: number
  livrets: number
}

export interface DashboardStats {
  patrimoineTotal: number
  beneficeGlobal: number
  performanceGlobale: number
  totalLivrets: number
  performanceMensuelle: number
  investissementMoyen: number
}

export interface ProjectionData {
  annees: number
  valeur: number
  investissementTotal: number
  gains: number
}
