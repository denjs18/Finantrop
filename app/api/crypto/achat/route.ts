import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import dbConnect from '@/lib/db/mongodb'
import { IS_MEMORY_MODE } from '@/lib/db/memoryDb'
import AchatCrypto from '@/lib/db/models/AchatCrypto'
import mongoose from 'mongoose'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { crypto, montant, prix, mois } = await req.json()
    if (!crypto || montant === undefined || prix === undefined || !mois) {
      return NextResponse.json({ error: 'crypto, montant, prix et mois requis' }, { status: 400 })
    }

    const [annee, moisNum] = (mois as string).split('-').map(Number)
    const moisDate = new Date(Date.UTC(annee, moisNum - 1, 1))

    await dbConnect()

    const userId = IS_MEMORY_MODE
      ? session.user.id
      : new mongoose.Types.ObjectId(session.user.id)

    const achat = await AchatCrypto.create({
      userId,
      mois: moisDate,
      crypto: crypto.trim(),
      montant: Number(montant),
      prix: Number(prix),
    })

    return NextResponse.json({
      _id: achat._id.toString(),
      crypto: achat.crypto,
      montant: achat.montant,
      prix: achat.prix,
      mois: achat.mois,
    }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST achat crypto:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
