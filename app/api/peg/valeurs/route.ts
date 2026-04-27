import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import dbConnect from '@/lib/db/mongodb'
import { IS_MEMORY_MODE } from '@/lib/db/memoryDb'
import ValeurPEG from '@/lib/db/models/ValeurPEG'
import mongoose from 'mongoose'

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { valeurs, mois } = await req.json()
    if (!Array.isArray(valeurs) || !mois) {
      return NextResponse.json({ error: 'valeurs[] et mois requis' }, { status: 400 })
    }

    const [annee, moisNum] = (mois as string).split('-').map(Number)
    const moisDate = new Date(Date.UTC(annee, moisNum - 1, 1))

    await dbConnect()

    const userId = IS_MEMORY_MODE
      ? session.user.id
      : new mongoose.Types.ObjectId(session.user.id)

    const results = await Promise.all(
      valeurs.map(({ indice, valeur }: { indice: string; valeur: number }) =>
        ValeurPEG.findOneAndUpdate(
          { userId, indice: indice.trim(), mois: moisDate },
          { valeur: Number(valeur) },
          { upsert: true, new: true }
        )
      )
    )

    return NextResponse.json({ saved: results.length })
  } catch (error) {
    console.error('Erreur PUT valeurs PEG:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
