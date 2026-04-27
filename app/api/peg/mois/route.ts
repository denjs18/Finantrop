import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db/mongodb'
import { IS_MEMORY_MODE } from '@/lib/db/memoryDb'
import VersementPEG from '@/lib/db/models/VersementPEG'
import ValeurPEG from '@/lib/db/models/ValeurPEG'

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
    const userId = IS_MEMORY_MODE
      ? session.user.id
      : new mongoose.Types.ObjectId(session.user.id)

    await dbConnect()

    // Tous les versements jusqu'à la fin du mois (pour calculer le total cumulé)
    const tousLesVersements = (await VersementPEG.find({
      userId,
      date: { $lt: fin },
    })) as any[]

    const versementsDuMois = tousLesVersements.filter((v: any) => {
      const d = new Date(v.date)
      return d >= debut && d < fin
    })

    // Indices connus
    const indicesConnus = [...new Set(tousLesVersements.map((v: any) => v.indice))] as string[]

    // Valeurs accumulées saisies pour ce mois
    const valeursDuMois = (await ValeurPEG.find({
      userId,
      mois: debut,
    })) as any[]

    const valeurMap = new Map<string, number>()
    for (const v of valeursDuMois) {
      valeurMap.set(v.indice, v.valeur)
    }

    // Fallback : dernier mois connu si pas de valeur ce mois
    const indicesSansValeur = indicesConnus.filter((i) => !valeurMap.has(i))
    if (indicesSansValeur.length > 0) {
      const dernieres = (await ValeurPEG.aggregate([
        {
          $match: {
            userId,
            indice: { $in: indicesSansValeur },
            mois: { $lt: fin },
          },
        },
        { $sort: { mois: -1 } },
        { $group: { _id: '$indice', valeur: { $first: '$valeur' } } },
      ])) as { _id: string; valeur: number }[]
      for (const d of dernieres) {
        valeurMap.set(d._id, d.valeur)
      }
    }

    // Récap par indice
    const recap = indicesConnus.map((indice) => {
      const versIndice = tousLesVersements.filter((v: any) => v.indice === indice)
      const versMois = versementsDuMois.filter((v: any) => v.indice === indice)

      const verseTotal = versIndice.reduce((s: number, v: any) => s + v.montant, 0)
      const verseCeMois = versMois.reduce((s: number, v: any) => s + v.montant, 0)
      const valeurActuelle = valeurMap.get(indice) ?? null
      const performance = valeurActuelle !== null && verseTotal > 0
        ? ((valeurActuelle - verseTotal) / verseTotal) * 100
        : null

      return { indice, verseCeMois, verseTotal, valeurActuelle, performance }
    })

    const totalVerseCeMois = versementsDuMois.reduce((s: number, v: any) => s + v.montant, 0)
    const totalVerseDepuisDebut = tousLesVersements.reduce((s: number, v: any) => s + v.montant, 0)
    const valeurTotale = recap.every((r) => r.valeurActuelle !== null)
      ? recap.reduce((s, r) => s + (r.valeurActuelle ?? 0), 0)
      : recap.some((r) => r.valeurActuelle !== null)
        ? recap.reduce((s, r) => s + (r.valeurActuelle ?? 0), 0)
        : null
    const performanceGlobale = valeurTotale !== null && totalVerseDepuisDebut > 0
      ? ((valeurTotale - totalVerseDepuisDebut) / totalVerseDepuisDebut) * 100
      : null

    const versements = versementsDuMois.map((v: any) => ({
      _id: v._id.toString(),
      indice: v.indice,
      montant: v.montant,
      date: v.date,
    }))

    const valeurs = valeursDuMois.map((v: any) => ({
      _id: v._id.toString(),
      indice: v.indice,
      valeur: v.valeur,
      mois: v.mois,
    }))

    return NextResponse.json({
      mois: moisStr,
      versements,
      valeurs,
      recap,
      totalVerseCeMois,
      totalVerseDepuisDebut,
      valeurTotale,
      performanceGlobale,
      indicesConnus,
    })
  } catch (error) {
    console.error('Erreur API PEG mois:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
