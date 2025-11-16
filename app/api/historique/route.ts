import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db/mongodb'
import MoisRecap from '@/lib/db/models/MoisRecap'
import Depense from '@/lib/db/models/Depense'
import Settings from '@/lib/db/models/Settings'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    await dbConnect()

    const historique = await MoisRecap.find({ userId: session.user.id })
      .sort({ annee: -1, mois: -1 })

    return NextResponse.json(historique)
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()

    await dbConnect()

    const existingRecap = await MoisRecap.findOne({
      userId: session.user.id,
      mois: body.mois,
      annee: body.annee,
    })

    if (existingRecap) {
      const updated = await MoisRecap.findByIdAndUpdate(
        existingRecap._id,
        body,
        { new: true }
      )
      return NextResponse.json(updated)
    }

    const recap = await MoisRecap.create({
      userId: session.user.id,
      ...body,
    })

    return NextResponse.json(recap, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du récapitulatif:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const mois = searchParams.get('mois')
    const annee = searchParams.get('annee')

    if (!mois || !annee) {
      return NextResponse.json({ error: 'Mois et année requis' }, { status: 400 })
    }

    await dbConnect()

    const startDate = new Date(parseInt(annee), parseInt(mois) - 1, 1)
    const endDate = new Date(parseInt(annee), parseInt(mois), 0, 23, 59, 59)

    const depenses = await Depense.find({
      userId: session.user.id,
      date: { $gte: startDate, $lte: endDate },
    })

    const totalFrais = depenses.reduce((sum, d) => sum + d.montant, 0)

    const settings = await Settings.findOne({ userId: session.user.id })
    const salaire = settings?.salaireMensuel || 0
    const epargneBourse = settings?.investissementMoyen || 0

    const reste = salaire - totalFrais - epargneBourse

    const recap = await MoisRecap.findOneAndUpdate(
      {
        userId: session.user.id,
        mois: parseInt(mois),
        annee: parseInt(annee),
      },
      {
        totalFrais,
        salaire,
        epargneBourse,
        reste,
      },
      { new: true, upsert: true }
    )

    return NextResponse.json(recap)
  } catch (error) {
    console.error('Erreur lors du calcul automatique:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
