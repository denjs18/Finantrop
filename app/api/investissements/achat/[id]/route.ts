import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import dbConnect from '@/lib/db/mongodb'
import Transaction from '@/lib/db/models/Transaction'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    await dbConnect()

    const transaction = await Transaction.findOneAndDelete({
      _id: params.id,
      userId: session.user.id,
      type: 'achat',
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Achat supprimé' })
  } catch (error) {
    console.error('Erreur suppression achat:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
