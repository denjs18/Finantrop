import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import dbConnect from '@/lib/db/mongodb'
import { IS_MEMORY_MODE } from '@/lib/db/memoryDb'
import VersementPEG from '@/lib/db/models/VersementPEG'
import mongoose from 'mongoose'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { indice, montant, mois } = await req.json()
    if (!indice || montant === undefined || !mois) {
      return NextResponse.json({ error: 'indice, montant et mois requis' }, { status: 400 })
    }

    const [annee, moisNum] = (mois as string).split('-').map(Number)
    const date = new Date(Date.UTC(annee, moisNum - 1, 1))

    await dbConnect()

    const userId = IS_MEMORY_MODE
      ? session.user.id
      : new mongoose.Types.ObjectId(session.user.id)

    const versement = await VersementPEG.create({
      userId,
      date,
      indice: indice.trim(),
      montant: Number(montant),
    })

    return NextResponse.json({
      _id: versement._id.toString(),
      indice: versement.indice,
      montant: versement.montant,
      date: versement.date,
    }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST versement PEG:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
