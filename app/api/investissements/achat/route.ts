import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import dbConnect from '@/lib/db/mongodb'
import Transaction from '@/lib/db/models/Transaction'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const { indice, quantite, prix, frais, date } = body

    if (!indice || typeof indice !== 'string' || indice.trim() === '') {
      return NextResponse.json({ error: 'Indice requis' }, { status: 400 })
    }
    if (!quantite || quantite <= 0) {
      return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 })
    }
    if (!prix || prix <= 0) {
      return NextResponse.json({ error: 'Prix invalide' }, { status: 400 })
    }
    if (frais !== undefined && frais < 0) {
      return NextResponse.json({ error: 'Frais invalides' }, { status: 400 })
    }

    await dbConnect()

    // Transaction.action est l'ancien nom du champ, on mappe indice -> action
    const transaction = await Transaction.create({
      userId: session.user.id,
      type: 'achat',
      action: indice.trim(),
      quantite: Number(quantite),
      prix: Number(prix),
      frais: Number(frais ?? 0),
      date: date ? new Date(date) : new Date(),
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Erreur création achat:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
