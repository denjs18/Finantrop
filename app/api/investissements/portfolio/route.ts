import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import dbConnect from '@/lib/db/mongodb'
import Portfolio from '@/lib/db/models/Portfolio'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    await dbConnect()

    const portfolio = await Portfolio.find({ userId: session.user.id })

    return NextResponse.json(portfolio)
  } catch (error) {
    console.error('Erreur lors de la récupération du portfolio:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const { action, prixActuel } = body

    await dbConnect()

    const portfolio = await Portfolio.findOneAndUpdate(
      { userId: session.user.id, action },
      { prixActuel },
      { new: true }
    )

    return NextResponse.json(portfolio)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du portfolio:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
