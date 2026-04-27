import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import dbConnect from '@/lib/db/mongodb'
import { IS_MEMORY_MODE } from '@/lib/db/memoryDb'
import AchatCrypto from '@/lib/db/models/AchatCrypto'
import mongoose from 'mongoose'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    await dbConnect()

    const userId = IS_MEMORY_MODE
      ? session.user.id
      : new mongoose.Types.ObjectId(session.user.id)

    const deleted = await AchatCrypto.findOneAndDelete({ _id: params.id, userId })

    if (!deleted) {
      return NextResponse.json({ error: 'Achat introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE achat crypto:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
