import mongoose, { Model, Schema } from 'mongoose'

export interface IUser extends mongoose.Document {
  email: string
  password: string
  nom: string
  createdAt: Date
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email requis'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Mot de passe requis'],
  },
  nom: {
    type: String,
    required: [true, 'Nom requis'],
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User
