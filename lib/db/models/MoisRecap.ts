import mongoose, { Model, Schema } from 'mongoose'
import { IS_MEMORY_MODE, MemoryCollection } from '@/lib/db/memoryDb'

export interface IMoisRecap extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  mois: number
  annee: number
  totalFrais: number
  salaire: number
  epargneBourse: number
  epargneLivrets: number
  reste: number
}

const MoisRecapSchema = new Schema<IMoisRecap>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  mois: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  annee: {
    type: Number,
    required: true,
  },
  totalFrais: {
    type: Number,
    required: true,
    default: 0,
  },
  salaire: {
    type: Number,
    required: true,
    default: 0,
  },
  epargneBourse: {
    type: Number,
    default: 0,
  },
  epargneLivrets: {
    type: Number,
    default: 0,
  },
  reste: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
})

MoisRecapSchema.index({ userId: 1, mois: 1, annee: 1 }, { unique: true })

const MoisRecap: any = IS_MEMORY_MODE
  ? new MemoryCollection('mois_recaps')
  : (mongoose.models.MoisRecap || mongoose.model<IMoisRecap>('MoisRecap', MoisRecapSchema))

export default MoisRecap
