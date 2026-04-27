'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Save, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function fmtEvol(n: number | null): string {
  if (n === null) return '—'
  const sign = n > 0 ? '+' : ''
  return sign + n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompteRow {
  nom: string
  solde: number | null
  dernierSolde: number | null
  evolution: number | null
}

interface ApiData {
  comptes: CompteRow[]
  total: number
  totalCeMois: number
  comptesConnus: string[]
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EpargnePage() {
  const { toast } = useToast()
  const [mois, setMois] = useState(currentMoisStr())
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [newNom, setNewNom] = useState('')
  const [newSolde, setNewSolde] = useState('')

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteNom, setDeleteNom] = useState('')

  const [soldeInputs, setSoldeInputs] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/epargne/mois?mois=${mois}`)
      if (!res.ok) throw new Error('Erreur réseau')
      const json: ApiData = await res.json()
      setData(json)

      const inputs: Record<string, string> = {}
      for (const c of json.comptes) {
        if (c.solde !== null) inputs[c.nom] = String(c.solde)
      }
      setSoldeInputs(inputs)
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les données', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [mois])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Handlers ──

  async function handleSaveSoldes() {
    const payload = Object.entries(soldeInputs)
      .filter(([, v]) => v !== '' && !isNaN(parseFloat(v)))
      .map(([nom, v]) => ({ nom, solde: parseFloat(v) }))

    if (payload.length === 0) return

    try {
      const res = await fetch('/api/epargne/soldes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soldes: payload, mois }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Soldes enregistrés', description: `${payload.length} compte(s) mis à jour` })
      fetchData()
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'enregistrer les soldes', variant: 'destructive' })
    }
  }

  async function handleAddCompte() {
    if (!newNom.trim() || !newSolde) return
    try {
      const res = await fetch('/api/epargne/compte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: newNom.trim(), solde: parseFloat(newSolde), mois }),
      })
      if (!res.ok) throw new Error()
      setDialogOpen(false)
      setNewNom('')
      setNewSolde('')
      fetchData()
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter le compte', variant: 'destructive' })
    }
  }

  async function handleDeleteCompte() {
    if (!deleteNom) return
    try {
      const res = await fetch('/api/epargne/compte', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: deleteNom }),
      })
      if (!res.ok) throw new Error()
      setDeleteDialogOpen(false)
      setDeleteNom('')
      fetchData()
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer le compte', variant: 'destructive' })
    }
  }

  const isFutur = mois > currentMoisStr()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header + nav mois */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Comptes d&apos;épargne</h1>
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
          {/* ── Total épargne ── */}
          {data.comptesConnus.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total épargne</p>
                  <p className="text-4xl font-bold">{fmt(data.total)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Soldes du mois ── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Soldes du mois</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter un compte</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouveau compte d&apos;épargne</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-1">
                      <Label>Nom du compte</Label>
                      <Input
                        placeholder="ex : Livret A, LDDS, CEL…"
                        value={newNom}
                        onChange={(e) => setNewNom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Solde actuel (€)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="5000.00"
                        value={newSolde}
                        onChange={(e) => setNewSolde(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddCompte} disabled={!newNom.trim() || !newSolde}>
                      Enregistrer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {data.comptes.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun compte enregistré.</p>
              ) : (
                <div className="space-y-4">
                  {data.comptes.map((c) => {
                    const evol = c.evolution
                    const evolColor = evol === null ? 'text-muted-foreground' : evol > 0 ? 'text-green-500' : evol < 0 ? 'text-red-500' : 'text-muted-foreground'
                    const EvolIcon = evol === null || evol === 0 ? Minus : evol > 0 ? TrendingUp : TrendingDown
                    return (
                      <div key={c.nom} className="flex items-center gap-3">
                        <Label className="w-44 shrink-0 font-medium">{c.nom}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-40"
                          placeholder={c.dernierSolde !== null ? String(c.dernierSolde.toFixed(2)) : '0.00'}
                          value={soldeInputs[c.nom] ?? ''}
                          onChange={(e) =>
                            setSoldeInputs((prev) => ({ ...prev, [c.nom]: e.target.value }))
                          }
                        />
                        <span className="text-sm text-muted-foreground">€</span>
                        {c.evolution !== null && (
                          <span className={`flex items-center gap-1 text-sm font-medium ${evolColor}`}>
                            <EvolIcon className="h-4 w-4" />
                            {fmtEvol(c.evolution)}
                          </span>
                        )}
                        {c.solde === null && c.dernierSolde !== null && (
                          <span className="text-xs text-muted-foreground">
                            dernier : {fmt(c.dernierSolde)}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => { setDeleteNom(c.nom); setDeleteDialogOpen(true) }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-semibold text-muted-foreground">
                      Saisis ce mois : {fmt(data.totalCeMois)}
                    </span>
                    <Button onClick={handleSaveSoldes}>
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer les soldes
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Récapitulatif ── */}
          {data.comptes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4">Compte</th>
                        <th className="text-right py-2 px-4">Solde ce mois</th>
                        <th className="text-right py-2 px-4">Mois précédent</th>
                        <th className="text-right py-2 pl-4">Évolution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.comptes.map((c) => {
                        const evol = c.evolution
                        const evolColor = evol === null ? '' : evol > 0 ? 'text-green-500' : evol < 0 ? 'text-red-500' : ''
                        return (
                          <tr key={c.nom} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{c.nom}</td>
                            <td className="text-right py-2 px-4 tabular-nums">
                              {c.solde !== null ? fmt(c.solde) : (
                                <span className="text-muted-foreground">{fmt(c.dernierSolde)}</span>
                              )}
                            </td>
                            <td className="text-right py-2 px-4 tabular-nums text-muted-foreground">
                              {fmt(c.dernierSolde)}
                            </td>
                            <td className={`text-right py-2 pl-4 tabular-nums font-semibold ${evolColor}`}>
                              {fmtEvol(evol)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td className="py-2 pr-4">TOTAL</td>
                        <td className="text-right py-2 px-4 tabular-nums" colSpan={3}>
                          {fmt(data.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Dialog confirmation suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le compte</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Supprimer <span className="font-semibold text-foreground">{deleteNom}</span> et tout son historique de soldes ? Cette action est irréversible.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteCompte}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
