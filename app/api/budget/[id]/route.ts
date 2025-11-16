import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db/mongodb'
import Depense from '@/lib/db/models/Depense'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    await dbConnect()

    const depense = await Depense.findOneAndDelete({
      _id: params.id,
      userId: session.user.id,
    })

    if (!depense) {
      return NextResponse.json({ error: 'Dépense non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Dépense supprimée' })
  } catch (error) {
    console.error('Erreur lors de la suppression de la dépense:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()

    await dbConnect()

    const depense = await Depense.findOneAndUpdate(
      { _id: params.id, userId: session.user.id },
      body,
      { new: true }
    )

    if (!depense) {
      return NextResponse.json({ error: 'Dépense non trouvée' }, { status: 404 })
    }

    return NextResponse.json(depense)
  } catch (error) {
    console.error('Erreur lors de la modification de la dépense:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
