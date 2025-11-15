import mongoose, { Model, Schema } from 'mongoose'

export interface ITransaction extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  date: Date
  type: 'achat' | 'vente'
  action: string
  quantite: number
  prix: number
  frais: number
}

const TransactionSchema = new Schema<ITransaction>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['achat', 'vente'],
  },
  action: {
    type: String,
    required: true,
  },
  quantite: {
    type: Number,
    required: true,
    min: 0,
  },
  prix: {
    type: Number,
    required: true,
    min: 0,
  },
  frais: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
})

TransactionSchema.index({ userId: 1, date: -1 })

const Transaction: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema)

export default Transaction
