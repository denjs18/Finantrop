import mongoose, { Schema } from 'mongoose'
import { IS_MEMORY_MODE, MemoryCollection } from '@/lib/db/memoryDb'

export interface ISoldeCompte extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  nom: string
  mois: Date
  solde: number
}

const SoldeCompteSchema = new Schema<ISoldeCompte>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  nom: { type: String, required: true },
  mois: { type: Date, required: true },
  solde: { type: Number, required: true, min: 0 },
}, { timestamps: true })

SoldeCompteSchema.index({ userId: 1, nom: 1, mois: 1 }, { unique: true })

const SoldeCompte: any = IS_MEMORY_MODE
  ? new MemoryCollection('soldes_compte')
  : (mongoose.models.SoldeCompte || mongoose.model<ISoldeCompte>('SoldeCompte', SoldeCompteSchema))

export default SoldeCompte
