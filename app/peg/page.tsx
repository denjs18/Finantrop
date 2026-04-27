'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { RecapIndicePEG } from '@/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatMois(moisStr: string): string {
  const [annee, mois] = moisStr.split('-').map(Number)
  return new Date(annee, mois - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function currentMoisStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(moisStr: string, delta: number): string {
  const [annee, mois] = moisStr.split('-').map(Number)
  const d = new Date(annee, mois - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmt(n: number | null): string {
  if (n === null) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function fmtPct(n: number | null): string {
  if (n === null) return '—'
  return (n >= 0 ? '+' : '') + n.toFixed(2) + ' %'
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface VersementRow {
  _id: string
  indice: string
  montant: number
}

interface ApiData {
  versements: VersementRow[]
  valeurs: { indice: string; valeur: number }[]
  recap: RecapIndicePEG[]
  totalVerseCeMois: number
  totalVerseDepuisDebut: number
  valeurTotale: number | null
  performanceGlobale: number | null
  indicesConnus: string[]
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PEGPage() {
  const { toast } = useToast()
  const [mois, setMois] = useState(currentMoisStr())
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newIndice, setNewIndice] = useState('')
  const [newMontant, setNewMontant] = useState('')

  // Valeurs accumulées (inputs)
  const [valeurInputs, setValeurInputs] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/peg/mois?mois=${mois}`)
      if (!res.ok) throw new Error('Erreur réseau')
      const json: ApiData = await res.json()
      setData(json)

      // Pre-fill valeur inputs from saved values
      const inputs: Record<string, string> = {}
      for (const v of json.valeurs) {
        inputs[v.indice] = String(v.valeur)
      }
      setValeurInputs(inputs)
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les données PEG', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [mois])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Handlers ──

  async function handleAddVersement() {
    if (!newIndice.trim() || !newMontant) return
    try {
      const res = await fetch('/api/peg/versement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indice: newIndice.trim(), montant: parseFloat(newMontant), mois }),
      })
      if (!res.ok) throw new Error()
      setDialogOpen(false)
      setNewIndice('')
      setNewMontant('')
      fetchData()
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter le versement', variant: 'destructive' })
    }
  }

  async function handleDeleteVersement(id: string) {
    try {
      const res = await fetch(`/api/peg/versement/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      fetchData()
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer le versement', variant: 'destructive' })
    }
  }

  async function handleSaveValeurs() {
    const payload = Object.entries(valeurInputs)
      .filter(([, v]) => v !== '' && !isNaN(parseFloat(v)))
      .map(([indice, v]) => ({ indice, valeur: parseFloat(v) }))

    if (payload.length === 0) return

    try {
      const res = await fetch('/api/peg/valeurs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valeurs: payload, mois }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Valeurs enregistrées', description: `${payload.length} indice(s) mis à jour` })
      fetchData()
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'enregistrer les valeurs', variant: 'destructive' })
    }
  }

  const isFutur = mois > currentMoisStr()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header + nav mois */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">PEG — Plan d&apos;Épargne Groupe</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMois(addMonths(mois, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-44 text-center font-semibold capitalize">{formatMois(mois)}</span>
          <Button variant="outline" size="icon" disabled={isFutur} onClick={() => setMois(addMonths(mois, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading && <p className="text-muted-foreground">Chargement…</p>}

      {!loading && data && (
        <>
          {/* ── Section 1 : Versements du mois ── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Versements du mois</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouveau versement PEG</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-1">
                      <Label>Indice</Label>
                      <Input
                        list="indice-suggestions"
                        placeholder="ex: Actions Monde, Monétaire…"
                        value={newIndice}
                        onChange={(e) => setNewIndice(e.target.value)}
                      />
                      <datalist id="indice-suggestions">
                        {data.indicesConnus.map((i) => (
                          <option key={i} value={i} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-1">
                      <Label>Montant versé (€)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="150.00"
                        value={newMontant}
                        onChange={(e) => setNewMontant(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddVersement} disabled={!newIndice.trim() || !newMontant}>
                      Enregistrer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {data.versements.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun versement ce mois.</p>
              ) : (
                <div className="space-y-2">
                  {data.versements.map((v) => (
                    <div key={v._id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="font-medium">{v.indice}</span>
                      <div className="flex items-center gap-4">
                        <span className="tabular-nums">{fmt(v.montant)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteVersement(v._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end pt-1 text-sm font-semibold">
                    Total versé ce mois : {fmt(data.totalVerseCeMois)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Section 2 : Valeurs accumulées ── */}
          {data.indicesConnus.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Valeurs accumulées (relevé du mois)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.indicesConnus.map((indice) => {
                    const lastKnown = data.recap.find((r) => r.indice === indice)?.valeurActuelle
                    return (
                      <div key={indice} className="flex items-center gap-3">
                        <Label className="w-52 shrink-0">{indice}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-40"
                          placeholder={lastKnown ? String(lastKnown.toFixed(2)) : '0.00'}
                          value={valeurInputs[indice] ?? ''}
                          onChange={(e) =>
                            setValeurInputs((prev) => ({ ...prev, [indice]: e.target.value }))
                          }
                        />
                        <span className="text-sm text-muted-foreground">€</span>
                        {lastKnown && !valeurInputs[indice] && (
                          <span className="text-xs text-muted-foreground">
                            dernier connu : {fmt(lastKnown)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveValeurs}>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer les valeurs
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Section 3 : Récapitulatif ── */}
          {data.recap.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4">Indice</th>
                        <th className="text-right py-2 px-4">Versé ce mois</th>
                        <th className="text-right py-2 px-4">Versé total</th>
                        <th className="text-right py-2 px-4">Valeur accumulée</th>
                        <th className="text-right py-2 pl-4">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recap.map((r) => {
                        const perf = r.performance
                        const perfColor = perf === null ? '' : perf >= 0 ? 'text-green-500' : 'text-red-500'
                        return (
                          <tr key={r.indice} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{r.indice}</td>
                            <td className="text-right py-2 px-4 tabular-nums">{fmt(r.verseCeMois)}</td>
                            <td className="text-right py-2 px-4 tabular-nums">{fmt(r.verseTotal)}</td>
                            <td className="text-right py-2 px-4 tabular-nums">{fmt(r.valeurActuelle)}</td>
                            <td className={`text-right py-2 pl-4 tabular-nums font-semibold ${perfColor}`}>
                              {fmtPct(perf)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td className="py-2 pr-4">TOTAL</td>
                        <td className="text-right py-2 px-4 tabular-nums">{fmt(data.totalVerseCeMois)}</td>
                        <td className="text-right py-2 px-4 tabular-nums">{fmt(data.totalVerseDepuisDebut)}</td>
                        <td className="text-right py-2 px-4 tabular-nums">{fmt(data.valeurTotale)}</td>
                        <td className={`text-right py-2 pl-4 tabular-nums ${
                          data.performanceGlobale === null ? '' :
                          data.performanceGlobale >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {fmtPct(data.performanceGlobale)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  La performance inclut l&apos;abondement employeur et le rendement du marché.
                </p>
              </CardContent>
            </Card>
          )}

          {data.indicesConnus.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>Aucun versement enregistré pour l&apos;instant.</p>
                <p className="text-sm mt-1">Commencez par ajouter un versement ci-dessus.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
