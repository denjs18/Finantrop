import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import dbConnect from '@/lib/db/mongodb'
import Transaction from '@/lib/db/models/Transaction'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    await dbConnect()

    const transactions = await Transaction.find({ userId: session.user.id }).sort({ date: -1 })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Erreur lors de la récupération des transactions:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
