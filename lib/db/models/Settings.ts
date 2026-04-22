import mongoose, { Model, Schema } from 'mongoose'
import { IS_MEMORY_MODE, MemoryCollection } from '@/lib/db/memoryDb'

export interface ISettings extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  salaireMensuel: number
  investissementMoyen: number
  performanceMoyenne: number
  livrets: number
}

const SettingsSchema = new Schema<ISettings>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  salaireMensuel: {
    type: Number,
    default: 0,
    min: 0,
  },
  investissementMoyen: {
    type: Number,
    default: 465,
    min: 0,
  },
  performanceMoyenne: {
    type: Number,
    default: 0.97,
  },
  livrets: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
})

const Settings: any = IS_MEMORY_MODE
  ? new MemoryCollection('settings')
  : (mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema))

export default Settings
