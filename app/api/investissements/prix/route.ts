import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import dbConnect from '@/lib/db/mongodb'
import PrixMensuel from '@/lib/db/models/PrixMensuel'

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const { indice, mois, prix } = body

    if (!indice || typeof indice !== 'string' || indice.trim() === '') {
      return NextResponse.json({ error: 'Indice requis' }, { status: 400 })
    }
    if (!mois || !/^\d{4}-\d{2}$/.test(mois)) {
      return NextResponse.json({ error: 'Format mois invalide (YYYY-MM)' }, { status: 400 })
    }
    if (!prix || prix <= 0) {
      return NextResponse.json({ error: 'Prix invalide' }, { status: 400 })
    }

    const [annee, moisNum] = mois.split('-').map(Number)
    const debutMois = new Date(Date.UTC(annee, moisNum - 1, 1))

    await dbConnect()

    const doc = await PrixMensuel.findOneAndUpdate(
      { userId: session.user.id, indice: indice.trim(), mois: debutMois },
      { prix: Number(prix) },
      { upsert: true, new: true }
    )

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Erreur mise à jour prix:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
