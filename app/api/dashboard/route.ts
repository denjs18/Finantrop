import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db/mongodb'
import Transaction from '@/lib/db/models/Transaction'
import PrixMensuel from '@/lib/db/models/PrixMensuel'
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

    const userId = new mongoose.Types.ObjectId(session.user.id)

    const [transactions, settings] = await Promise.all([
      Transaction.find({ userId, type: 'achat' }),
      Settings.findOne({ userId }),
    ])

    // Dernier prix connu par indice via agrégation
    const derniersKonnus = await PrixMensuel.aggregate<{ _id: string; prix: number }>([
      { $match: { userId } },
      { $sort: { mois: -1 } },
      { $group: { _id: '$indice', prix: { $first: '$prix' } } },
    ])
    const prixMap = new Map<string, number>(derniersKonnus.map((d) => [d._id, d.prix]))

    // Quantité totale par indice
    const qtParIndice = new Map<string, number>()
    const coutParIndice = new Map<string, number>()
    for (const t of transactions) {
      qtParIndice.set(t.action, (qtParIndice.get(t.action) ?? 0) + t.quantite)
      coutParIndice.set(t.action, (coutParIndice.get(t.action) ?? 0) + t.quantite * t.prix + t.frais)
    }

    let valeurTotale = 0
    let coutTotal = 0
    for (const [indice, qt] of qtParIndice) {
      const prix = prixMap.get(indice) ?? 0
      valeurTotale += qt * prix
      coutTotal += coutParIndice.get(indice) ?? 0
    }

    const beneficeGlobal = valeurTotale - coutTotal
    const performanceGlobale = coutTotal > 0 ? (beneficeGlobal / coutTotal) * 100 : 0

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const depensesMois = await Depense.find({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    })

    const totalFraisMois = depensesMois.reduce((sum, d) => sum + d.montant, 0)

    const last12Months = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const mois = date.getMonth() + 1
      const annee = date.getFullYear()

      const recap = await MoisRecap.findOne({ userId, mois, annee })

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
