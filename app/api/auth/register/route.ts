import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import dbConnect from '@/lib/db/mongodb'
import User from '@/lib/db/models/User'
import Settings from '@/lib/db/models/Settings'
import { registerSchema } from '@/lib/validations/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password, nom } = validation.data

    await dbConnect()

    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      email,
      password: hashedPassword,
      nom,
    })

    await Settings.create({
      userId: user._id,
      salaireMensuel: 0,
      investissementMoyen: 465,
      performanceMoyenne: 0.97,
      livrets: 0,
    })

    return NextResponse.json(
      { message: 'Compte créé avec succès' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
