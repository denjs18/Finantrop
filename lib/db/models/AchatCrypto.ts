import mongoose, { Schema } from 'mongoose'
import { IS_MEMORY_MODE, MemoryCollection } from '@/lib/db/memoryDb'

export interface IAchatCrypto extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  mois: Date
  crypto: string
  montant: number
  prix: number
}

const AchatCryptoSchema = new Schema<IAchatCrypto>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  mois: { type: Date, required: true },
  crypto: { type: String, required: true },
  montant: { type: Number, required: true, min: 0 },
  prix: { type: Number, required: true, min: 0 },
}, { timestamps: true })

AchatCryptoSchema.index({ userId: 1, mois: 1 })

const AchatCrypto: any = IS_MEMORY_MODE
  ? new MemoryCollection('achats_crypto')
  : (mongoose.models.AchatCrypto || mongoose.model<IAchatCrypto>('AchatCrypto', AchatCryptoSchema))

export default AchatCrypto
