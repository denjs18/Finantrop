import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db/mongodb'
import Portfolio from '@/lib/db/models/Portfolio'
import Settings from '@/lib/db/models/Settings'
import Depense from '@/lib/db/models/Depense'
import MoisRecap from '@/lib/db/models/MoisRecap'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    await dbConnect()

    const [portfolio, settings] = await Promise.all([
      Portfolio.find({ userId: session.user.id }),
      Settings.findOne({ userId: session.user.id }),
    ])

    const valeurTotale = portfolio.reduce((sum, item) => {
      const prixActuel = item.prixActuel || item.prixMoyenAchat
      return sum + (item.quantite * prixActuel)
    }, 0)

    const coutTotal = portfolio.reduce((sum, item) => {
      return sum + (item.quantite * item.prixMoyenAchat) + item.fraisTotal
    }, 0)

    const beneficeGlobal = valeurTotale - coutTotal
    const performanceGlobale = coutTotal > 0 ? ((beneficeGlobal / coutTotal) * 100) : 0

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const depensesMois = await Depense.find({
      userId: session.user.id,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    })

    const totalFraisMois = depensesMois.reduce((sum, d) => sum + d.montant, 0)

    const last12Months = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const mois = date.getMonth() + 1
      const annee = date.getFullYear()

      const recap = await MoisRecap.findOne({
        userId: session.user.id,
        mois,
        annee,
      })

      last12Months.push({
        mois: date.toLocaleDateString('fr-FR', { month: 'short' }),
        patrimoine: recap?.epargneBourse || 0,
      })
    }

    return NextResponse.json({
      patrimoineTotal: valeurTotale,
      beneficeGlobal,
      performanceGlobale,
      totalLivrets: settings?.livrets || 0,
      performanceMoyenne: settings?.performanceMoyenne || 0.97,
      investissementMoyen: settings?.investissementMoyen || 465,
      totalFraisMois,
      evolution12Mois: last12Months,
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du dashboard:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
