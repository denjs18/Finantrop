import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db/mongodb'
import Transaction from '@/lib/db/models/Transaction'
import Portfolio from '@/lib/db/models/Portfolio'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const { type, action, quantite, prix, frais, date } = body

    await dbConnect()

    const transaction = await Transaction.create({
      userId: session.user.id,
      type,
      action,
      quantite,
      prix,
      frais: frais || 0,
      date,
    })

    let portfolio = await Portfolio.findOne({
      userId: session.user.id,
      action,
    })

    if (type === 'achat') {
      if (portfolio) {
        const nouvelleQuantite = portfolio.quantite + quantite
        const nouveauxFrais = portfolio.fraisTotal + (frais || 0)
        const nouveauPrixMoyen =
          ((portfolio.prixMoyenAchat * portfolio.quantite) + (prix * quantite)) / nouvelleQuantite

        portfolio.quantite = nouvelleQuantite
        portfolio.prixMoyenAchat = nouveauPrixMoyen
        portfolio.fraisTotal = nouveauxFrais
        await portfolio.save()
      } else {
        await Portfolio.create({
          userId: session.user.id,
          action,
          quantite,
          prixMoyenAchat: prix,
          fraisTotal: frais || 0,
        })
      }
    } else if (type === 'vente' && portfolio) {
      portfolio.quantite -= quantite
      portfolio.fraisTotal += frais || 0

      if (portfolio.quantite <= 0) {
        await Portfolio.deleteOne({ _id: portfolio._id })
      } else {
        await portfolio.save()
      }
    }

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de la transaction:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
