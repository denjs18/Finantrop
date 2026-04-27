import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import dbConnect from '@/lib/db/mongodb'
import { IS_MEMORY_MODE } from '@/lib/db/memoryDb'
import SoldeCompte from '@/lib/db/models/SoldeCompte'
import mongoose from 'mongoose'

// POST : créer un nouveau compte avec son premier solde
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { nom, solde, mois } = await req.json()
    if (!nom || solde === undefined || !mois) {
      return NextResponse.json({ error: 'nom, solde et mois requis' }, { status: 400 })
    }

    const [annee, moisNum] = (mois as string).split('-').map(Number)
    const moisDate = new Date(Date.UTC(annee, moisNum - 1, 1))

    await dbConnect()

    const userId = IS_MEMORY_MODE
      ? session.user.id
      : new mongoose.Types.ObjectId(session.user.id)

    const entry = await SoldeCompte.findOneAndUpdate(
      { userId, nom: nom.trim(), mois: moisDate },
      { solde: Number(solde) },
      { upsert: true, new: true }
    )

    return NextResponse.json({ _id: entry._id.toString(), nom: entry.nom, solde: entry.solde }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST compte épargne:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE : supprimer tous les soldes d'un compte
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { nom } = await req.json()
    if (!nom) {
      return NextResponse.json({ error: 'nom requis' }, { status: 400 })
    }

    await dbConnect()

    const userId = IS_MEMORY_MODE
      ? session.user.id
      : new mongoose.Types.ObjectId(session.user.id)

    const result = await SoldeCompte.deleteMany({ userId, nom: nom.trim() })
    return NextResponse.json({ deleted: result.deletedCount ?? 0 })
  } catch (error) {
    console.error('Erreur DELETE compte épargne:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
