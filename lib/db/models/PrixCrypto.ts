import mongoose, { Schema } from 'mongoose'
import { IS_MEMORY_MODE, MemoryCollection } from '@/lib/db/memoryDb'

export interface IPrixCrypto extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  crypto: string
  mois: Date
  prix: number
}

const PrixCryptoSchema = new Schema<IPrixCrypto>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  crypto: { type: String, required: true },
  mois: { type: Date, required: true },
  prix: { type: Number, required: true, min: 0 },
}, { timestamps: true })

PrixCryptoSchema.index({ userId: 1, crypto: 1, mois: 1 }, { unique: true })

const PrixCrypto: any = IS_MEMORY_MODE
  ? new MemoryCollection('prix_crypto')
  : (mongoose.models.PrixCrypto || mongoose.model<IPrixCrypto>('PrixCrypto', PrixCryptoSchema))

export default PrixCrypto
