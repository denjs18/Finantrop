import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db/mongodb'
import { IS_MEMORY_MODE } from '@/lib/db/memoryDb'
import AchatCrypto from '@/lib/db/models/AchatCrypto'
import PrixCrypto from '@/lib/db/models/PrixCrypto'

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
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const now = new Date()
    const moisStr = searchParams.get('mois')
      ?? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

    const debut = debutMois(moisStr)
    const fin = finMois(moisStr)

    await dbConnect()

    const userId = IS_MEMORY_MODE
      ? session.user.id
      : new mongoose.Types.ObjectId(session.user.id)

    // Tous les achats jusqu'à la fin du mois
    const tousLesAchats = (await AchatCrypto.find({
      userId,
      mois: { $lt: fin },
    })) as any[]

    const achatsDuMois = tousLesAchats.filter((a: any) => {
      const d = new Date(a.mois)
      return d >= debut && d < fin
    })

    // Cryptos connues (depuis tout l'historique)
    const cryptosConnues = [...new Set(tousLesAchats.map((a: any) => a.crypto))] as string[]

    // Prix saisis pour ce mois
    const prixDuMois = (await PrixCrypto.find({ userId, mois: debut })) as any[]

    const prixMap = new Map<string, number>()
    for (const p of prixDuMois) {
      prixMap.set(p.crypto, p.prix)
    }

    // Fallback : dernier prix connu si pas de prix ce mois
    const cryptosSansPrix = cryptosConnues.filter((c) => !prixMap.has(c))
    if (cryptosSansPrix.length > 0) {
      const derniers = (await PrixCrypto.aggregate([
        {
          $match: {
            userId,
            crypto: { $in: cryptosSansPrix },
            mois: { $lt: fin },
          },
        },
        { $sort: { mois: -1 } },
        { $group: { _id: '$crypto', prix: { $first: '$prix' } } },
      ])) as { _id: string; prix: number }[]
      for (const d of derniers) {
        prixMap.set(d._id, d.prix)
      }
    }

    // Récap par crypto
    const recap = cryptosConnues.map((crypto) => {
      const achatsTotal = tousLesAchats.filter((a: any) => a.crypto === crypto)
      const achatsMois = achatsDuMois.filter((a: any) => a.crypto === crypto)

      const investiTotal = achatsTotal.reduce((s: number, a: any) => s + a.montant, 0)
      const investiCeMois = achatsMois.reduce((s: number, a: any) => s + a.montant, 0)
      // quantité totale = somme(montant / prix_achat) par transaction
      const quantiteTotale = achatsTotal.reduce((s: number, a: any) => s + a.montant / a.prix, 0)

      const prixActuel = prixMap.get(crypto) ?? null
      const valeurActuelle = prixActuel !== null ? quantiteTotale * prixActuel : null
      const performance = valeurActuelle !== null && investiTotal > 0
        ? ((valeurActuelle - investiTotal) / investiTotal) * 100
        : null

      return { crypto, investiCeMois, investiTotal, quantiteTotale, prixActuel, valeurActuelle, performance }
    })

    const totalInvestiCeMois = achatsDuMois.reduce((s: number, a: any) => s + a.montant, 0)
    const totalInvestiDepuisDebut = tousLesAchats.reduce((s: number, a: any) => s + a.montant, 0)
    const valeurTotale = recap.some((r) => r.valeurActuelle !== null)
      ? recap.reduce((s, r) => s + (r.valeurActuelle ?? 0), 0)
      : null
    const performanceGlobale = valeurTotale !== null && totalInvestiDepuisDebut > 0
      ? ((valeurTotale - totalInvestiDepuisDebut) / totalInvestiDepuisDebut) * 100
      : null

    const achats = achatsDuMois.map((a: any) => ({
      _id: a._id.toString(),
      crypto: a.crypto,
      montant: a.montant,
      prix: a.prix,
      mois: a.mois,
    }))

    const prix = prixDuMois.map((p: any) => ({
      _id: p._id.toString(),
      crypto: p.crypto,
      prix: p.prix,
      mois: p.mois,
    }))

    return NextResponse.json({
      mois: moisStr,
      achats,
      prix,
      recap,
      totalInvestiCeMois,
      totalInvestiDepuisDebut,
      valeurTotale,
      performanceGlobale,
      cryptosConnues,
    })
  } catch (error) {
    console.error('Erreur API crypto mois:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
