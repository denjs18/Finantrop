import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db/mongodb'
import Transaction from '@/lib/db/models/Transaction'
import PrixMensuel from '@/lib/db/models/PrixMensuel'

function debutMois(moisStr: string): Date {
  const [annee, mois] = moisStr.split('-').map(Number)
  return new Date(Date.UTC(annee, mois - 1, 1))
}

function finMois(moisStr: string): Date {
  const [annee, mois] = moisStr.split('-').map(Number)
  return new Date(Date.UTC(annee, mois, 1))
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const moisParam = searchParams.get('mois')

    const now = new Date()
    const moisStr = moisParam ?? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

    const debut = debutMois(moisStr)
    const fin = finMois(moisStr)
    const userObjectId = new mongoose.Types.ObjectId(session.user.id)

    await dbConnect()

    // Toutes les transactions achat jusqu'à la fin du mois
    const toutesTransactions = await Transaction.find({
      userId: userObjectId,
      type: 'achat',
      date: { $lt: fin },
    }).sort({ date: 1 })

    // Transactions du mois courant
    const achatsduMois = toutesTransactions.filter(
      (t) => t.date >= debut && t.date < fin
    )

    // Indices uniques dans tout l'historique
    const indicesConnus = [...new Set(toutesTransactions.map((t) => t.action))]

    // Prix enregistrés pour ce mois
    const prixDuMois = await PrixMensuel.find({
      userId: userObjectId,
      mois: debut,
    })

    // Map indice -> prix actuel ce mois
    const prixMap = new Map<string, number>()
    for (const p of prixDuMois) {
      prixMap.set(p.indice, p.prix)
    }

    // Pour les indices sans prix ce mois, chercher le dernier prix connu
    const indicesSansPrix = indicesConnus.filter((i) => !prixMap.has(i))
    if (indicesSansPrix.length > 0) {
      const derniersConnus = await PrixMensuel.aggregate<{ _id: string; prix: number }>([
        {
          $match: {
            userId: userObjectId,
            indice: { $in: indicesSansPrix },
            mois: { $lt: fin },
          },
        },
        { $sort: { mois: -1 } },
        { $group: { _id: '$indice', prix: { $first: '$prix' } } },
      ])
      for (const d of derniersConnus) {
        prixMap.set(d._id, d.prix)
      }
    }

    // Calcul du récapitulatif par indice
    const recap = indicesConnus.map((indice) => {
      const transactionsIndice = toutesTransactions.filter((t) => t.action === indice)
      const transactionsMois = achatsduMois.filter((t) => t.action === indice)

      const quantiteTotale = transactionsIndice.reduce((s, t) => s + t.quantite, 0)
      const investiTotal = transactionsIndice.reduce((s, t) => s + t.quantite * t.prix + t.frais, 0)
      const investiCeMois = transactionsMois.reduce((s, t) => s + t.quantite * t.prix + t.frais, 0)

      const prixActuel = prixMap.get(indice) ?? null
      const valeurActuelle = prixActuel !== null ? quantiteTotale * prixActuel : null
      const performance =
        valeurActuelle !== null && investiTotal > 0
          ? ((valeurActuelle - investiTotal) / investiTotal) * 100
          : null

      return { indice, investiCeMois, investiTotal, quantiteTotale, prixActuel, valeurActuelle, performance }
    })

    const totalInvestiCeMois = recap.reduce((s, r) => s + r.investiCeMois, 0)
    const totalInvestiDepuisDebut = recap.reduce((s, r) => s + r.investiTotal, 0)
    const hasMissingPrices = recap.some((r) => r.valeurActuelle === null)
    const valeurTotale = recap.length > 0
      ? recap.reduce((s, r) => s + (r.valeurActuelle ?? 0), 0)
      : null

    const achats = achatsduMois.map((t) => ({
      _id: t._id.toString(),
      userId: t.userId.toString(),
      date: t.date,
      indice: t.action,
      quantite: t.quantite,
      prix: t.prix,
      frais: t.frais,
    }))

    const prix = prixDuMois.map((p) => ({
      _id: p._id.toString(),
      userId: p.userId.toString(),
      indice: p.indice,
      mois: p.mois,
      prix: p.prix,
    }))

    return NextResponse.json({
      mois: moisStr,
      achats,
      prix,
      recap,
      totalInvestiCeMois,
      totalInvestiDepuisDebut,
      valeurTotale,
      hasMissingPrices,
      indicesConnus,
    })
  } catch (error) {
    console.error('Erreur API mois:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
