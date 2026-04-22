import mongoose, { Model, Schema } from 'mongoose'
import { IS_MEMORY_MODE, MemoryCollection } from '@/lib/db/memoryDb'

export interface IPrixMensuel extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  indice: string
  mois: Date
  prix: number
}

const PrixMensuelSchema = new Schema<IPrixMensuel>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  indice: {
    type: String,
    required: true,
  },
  mois: {
    type: Date,
    required: true,
  },
  prix: {
    type: Number,
    required: true,
    min: 0,
  },
}, {
  timestamps: true,
})

PrixMensuelSchema.index({ userId: 1, indice: 1, mois: 1 }, { unique: true })

const PrixMensuel: any = IS_MEMORY_MODE
  ? new MemoryCollection('prix_mensuel')
  : (mongoose.models.PrixMensuel || mongoose.model<IPrixMensuel>('PrixMensuel', PrixMensuelSchema))

export default PrixMensuel
