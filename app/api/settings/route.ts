import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import dbConnect from '@/lib/db/mongodb'
import Settings from '@/lib/db/models/Settings'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    await dbConnect()

    let settings = await Settings.findOne({ userId: session.user.id })

    if (!settings) {
      settings = await Settings.create({
        userId: session.user.id,
        salaireMensuel: 0,
        investissementMoyen: 465,
        performanceMoyenne: 0.97,
        livrets: 0,
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()

    await dbConnect()

    const settings = await Settings.findOneAndUpdate(
      { userId: session.user.id },
      body,
      { new: true, upsert: true }
    )

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
