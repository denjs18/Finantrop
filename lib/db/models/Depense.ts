import mongoose, { Model, Schema } from 'mongoose'

export interface IDepense extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  date: Date
  categorie: string
  montant: number
  description?: string
}

const DepenseSchema = new Schema<IDepense>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  categorie: {
    type: String,
    required: true,
    enum: [
      'loyer',
      'electricite_gaz',
      'mobile',
      'sport',
      'voiture_logement',
      'courses',
      'essence',
      'amazon',
      'autres',
    ],
  },
  montant: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
  },
}, {
  timestamps: true,
})

DepenseSchema.index({ userId: 1, date: -1 })

const Depense: Model<IDepense> = mongoose.models.Depense || mongoose.model<IDepense>('Depense', DepenseSchema)

export default Depense
