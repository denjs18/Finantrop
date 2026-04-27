import mongoose, { Schema } from 'mongoose'
import { IS_MEMORY_MODE, MemoryCollection } from '@/lib/db/memoryDb'

export interface IValeurPEG extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  indice: string
  mois: Date
  valeur: number
}

const ValeurPEGSchema = new Schema<IValeurPEG>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  indice: { type: String, required: true },
  mois: { type: Date, required: true },
  valeur: { type: Number, required: true, min: 0 },
}, { timestamps: true })

ValeurPEGSchema.index({ userId: 1, indice: 1, mois: 1 }, { unique: true })

const ValeurPEG: any = IS_MEMORY_MODE
  ? new MemoryCollection('valeurs_peg')
  : (mongoose.models.ValeurPEG || mongoose.model<IValeurPEG>('ValeurPEG', ValeurPEGSchema))

export default ValeurPEG
