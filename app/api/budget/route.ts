import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import dbConnect from '@/lib/db/mongodb'
import Depense from '@/lib/db/models/Depense'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const mois = searchParams.get('mois')
    const annee = searchParams.get('annee')

    await dbConnect()

    let query: any = { userId: session.user.id }

    if (mois && annee) {
      const startDate = new Date(parseInt(annee), parseInt(mois) - 1, 1)
      const endDate = new Date(parseInt(annee), parseInt(mois), 0, 23, 59, 59)
      query.date = { $gte: startDate, $lte: endDate }
    }

    const depenses = await Depense.find(query).sort({ date: -1 })

    return NextResponse.json(depenses)
  } catch (error) {
    console.error('Erreur lors de la récupération des dépenses:', error)
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

    const depense = await Depense.create({
      userId: session.user.id,
      ...body,
    })

    return NextResponse.json(depense, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de la dépense:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
