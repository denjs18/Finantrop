import mongoose, { Schema } from 'mongoose'
import { IS_MEMORY_MODE, MemoryCollection } from '@/lib/db/memoryDb'

export interface IVersementPEG extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  date: Date
  indice: string
  montant: number
}

const VersementPEGSchema = new Schema<IVersementPEG>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  indice: { type: String, required: true },
  montant: { type: Number, required: true, min: 0 },
}, { timestamps: true })

VersementPEGSchema.index({ userId: 1, date: 1 })

const VersementPEG: any = IS_MEMORY_MODE
  ? new MemoryCollection('versements_peg')
  : (mongoose.models.VersementPEG || mongoose.model<IVersementPEG>('VersementPEG', VersementPEGSchema))

export default VersementPEG
