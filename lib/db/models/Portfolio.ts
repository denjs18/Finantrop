import mongoose, { Model, Schema } from 'mongoose'

export interface IPortfolio extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  action: string
  quantite: number
  prixMoyenAchat: number
  fraisTotal: number
  prixActuel?: number
}

const PortfolioSchema = new Schema<IPortfolio>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
  prixMoyenAchat: {
    type: Number,
    required: true,
    min: 0,
  },
  fraisTotal: {
    type: Number,
    default: 0,
    min: 0,
  },
  prixActuel: {
    type: Number,
    min: 0,
  },
}, {
  timestamps: true,
})

PortfolioSchema.index({ userId: 1, action: 1 }, { unique: true })

const Portfolio: Model<IPortfolio> = mongoose.models.Portfolio || mongoose.model<IPortfolio>('Portfolio', PortfolioSchema)

export default Portfolio
