import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import dbConnect from '@/lib/db/mongodb'
import { IS_MEMORY_MODE } from '@/lib/db/memoryDb'
import SoldeCompte from '@/lib/db/models/SoldeCompte'
import mongoose from 'mongoose'

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { soldes, mois } = await req.json()
    if (!Array.isArray(soldes) || !mois) {
      return NextResponse.json({ error: 'soldes[] et mois requis' }, { status: 400 })
    }

    const [annee, moisNum] = (mois as string).split('-').map(Number)
    const moisDate = new Date(Date.UTC(annee, moisNum - 1, 1))

    await dbConnect()

    const userId = IS_MEMORY_MODE
      ? session.user.id
      : new mongoose.Types.ObjectId(session.user.id)

    const results = await Promise.all(
      soldes.map(({ nom, solde }: { nom: string; solde: number }) =>
        SoldeCompte.findOneAndUpdate(
          { userId, nom: nom.trim(), mois: moisDate },
          { solde: Number(solde) },
          { upsert: true, new: true }
        )
      )
    )

    return NextResponse.json({ saved: results.length })
  } catch (error) {
    console.error('Erreur PUT soldes épargne:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
