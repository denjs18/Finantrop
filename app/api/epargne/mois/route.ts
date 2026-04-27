import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db/mongodb'
import { IS_MEMORY_MODE } from '@/lib/db/memoryDb'
import SoldeCompte from '@/lib/db/models/SoldeCompte'

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

    // Tous les soldes existants (pour dériver les comptes connus)
    const tousLesSoldes = (await SoldeCompte.find({ userId })) as any[]
    const comptesConnus = [...new Set(tousLesSoldes.map((s: any) => s.nom))] as string[]

    // Soldes de ce mois
    const soldesDuMois = (await SoldeCompte.find({ userId, mois: debut })) as any[]
    const soldeMap = new Map<string, number>()
    for (const s of soldesDuMois) {
      soldeMap.set(s.nom, s.solde)
    }

    // Dernier solde connu pour les comptes sans entrée ce mois
    const comptesSansSolde = comptesConnus.filter((n) => !soldeMap.has(n))
    const dernierSoldeMap = new Map<string, number>()

    if (comptesSansSolde.length > 0) {
      const derniers = (await SoldeCompte.aggregate([
        { $match: { userId, nom: { $in: comptesSansSolde }, mois: { $lt: fin } } },
        { $sort: { mois: -1 } },
        { $group: { _id: '$nom', solde: { $first: '$solde' } } },
      ])) as { _id: string; solde: number }[]
      for (const d of derniers) {
        dernierSoldeMap.set(d._id, d.solde)
      }
    }
    // Aussi renseigner le dernier solde pour les comptes qui ont une entrée ce mois
    // (utile pour comparer avec le mois précédent)
    const comptesAvecSolde = comptesConnus.filter((n) => soldeMap.has(n))
    if (comptesAvecSolde.length > 0) {
      const precedents = (await SoldeCompte.aggregate([
        { $match: { userId, nom: { $in: comptesAvecSolde }, mois: { $lt: debut } } },
        { $sort: { mois: -1 } },
        { $group: { _id: '$nom', solde: { $first: '$solde' } } },
      ])) as { _id: string; solde: number }[]
      for (const d of precedents) {
        dernierSoldeMap.set(d._id, d.solde)
      }
    }

    // Construction de la réponse par compte
    const comptes = comptesConnus.map((nom) => {
      const solde = soldeMap.get(nom) ?? null
      const dernierSolde = dernierSoldeMap.get(nom) ?? null
      const evolution = solde !== null && dernierSolde !== null ? solde - dernierSolde : null
      return { nom, solde, dernierSolde, evolution }
    })

    // Total : utilise le solde ce mois s'il existe, sinon le dernier connu
    const total = comptes.reduce((s, c) => s + (c.solde ?? c.dernierSolde ?? 0), 0)
    const totalCeMois = soldesDuMois.reduce((s: number, c: any) => s + c.solde, 0)

    return NextResponse.json({ mois: moisStr, comptes, total, totalCeMois, comptesConnus })
  } catch (error) {
    console.error('Erreur API épargne mois:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
