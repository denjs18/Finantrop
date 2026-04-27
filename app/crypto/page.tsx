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
import { RecapCrypto } from '@/types'

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

function fmtQty(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })
}

function fmtPct(n: number | null): string {
  if (n === null) return '—'
  return (n >= 0 ? '+' : '') + n.toFixed(2) + ' %'
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AchatRow {
  _id: string
  crypto: string
  montant: number
  prix: number
}

interface ApiData {
  achats: AchatRow[]
  prix: { crypto: string; prix: number }[]
  recap: RecapCrypto[]
  totalInvestiCeMois: number
  totalInvestiDepuisDebut: number
  valeurTotale: number | null
  performanceGlobale: number | null
  cryptosConnues: string[]
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CryptoPage() {
  const { toast } = useToast()
  const [mois, setMois] = useState(currentMoisStr())
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [newCrypto, setNewCrypto] = useState('')
  const [newMontant, setNewMontant] = useState('')
  const [newPrix, setNewPrix] = useState('')

  const [prixInputs, setPrixInputs] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/crypto/mois?mois=${mois}`)
      if (!res.ok) throw new Error('Erreur réseau')
      const json: ApiData = await res.json()
      setData(json)

      const inputs: Record<string, string> = {}
      for (const p of json.prix) {
        inputs[p.crypto] = String(p.prix)
      }
      setPrixInputs(inputs)
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les données crypto', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [mois])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Handlers ──

  async function handleAddAchat() {
    if (!newCrypto.trim() || !newMontant || !newPrix) return
    try {
      const res = await fetch('/api/crypto/achat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crypto: newCrypto.trim(),
          montant: parseFloat(newMontant),
          prix: parseFloat(newPrix),
          mois,
        }),
      })
      if (!res.ok) throw new Error()
      setDialogOpen(false)
      setNewCrypto('')
      setNewMontant('')
      setNewPrix('')
      fetchData()
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'ajouter l'achat", variant: 'destructive' })
    }
  }

  async function handleDeleteAchat(id: string) {
    try {
      const res = await fetch(`/api/crypto/achat/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      fetchData()
    } catch {
      toast({ title: 'Erreur', description: "Impossible de supprimer l'achat", variant: 'destructive' })
    }
  }

  async function handleSavePrix() {
    const payload = Object.entries(prixInputs)
      .filter(([, v]) => v !== '' && !isNaN(parseFloat(v)))
      .map(([crypto, v]) => ({ crypto, prix: parseFloat(v) }))

    if (payload.length === 0) return

    try {
      const res = await fetch('/api/crypto/prix', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prix: payload, mois }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Prix enregistrés', description: `${payload.length} crypto(s) mis à jour` })
      fetchData()
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'enregistrer les prix", variant: 'destructive' })
    }
  }

  const isFutur = mois > currentMoisStr()

  // quantité déduite pour l'affichage d'un achat
  function qtyAchat(a: AchatRow): string {
    return fmtQty(a.montant / a.prix)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header + nav mois */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Crypto — DCA mensuel</h1>
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
          {/* ── Section 1 : Achats du mois ── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Achats du mois</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouvel achat crypto</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-1">
                      <Label>Crypto</Label>
                      <Input
                        list="crypto-suggestions"
                        placeholder="ex: Bitcoin, Ethereum, SOL…"
                        value={newCrypto}
                        onChange={(e) => setNewCrypto(e.target.value)}
                      />
                      <datalist id="crypto-suggestions">
                        {data.cryptosConnues.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-1">
                      <Label>Montant investi (€)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="100.00"
                        value={newMontant}
                        onChange={(e) => setNewMontant(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Prix unitaire au moment de l&apos;achat (€)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="95000.00"
                        value={newPrix}
                        onChange={(e) => setNewPrix(e.target.value)}
                      />
                    </div>
                    {newMontant && newPrix && parseFloat(newPrix) > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Quantité déduite : {fmtQty(parseFloat(newMontant) / parseFloat(newPrix))} {newCrypto || 'unités'}
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleAddAchat}
                      disabled={!newCrypto.trim() || !newMontant || !newPrix}
                    >
                      Enregistrer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {data.achats.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun achat ce mois.</p>
              ) : (
                <div className="space-y-2">
                  {data.achats.map((a) => (
                    <div key={a._id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="font-medium">{a.crypto}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {qtyAchat(a)} @ {fmt(a.prix)}
                        </span>
                        <span className="tabular-nums font-semibold">{fmt(a.montant)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteAchat(a._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end pt-1 text-sm font-semibold">
                    Total investi ce mois : {fmt(data.totalInvestiCeMois)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Section 2 : Prix du mois ── */}
          {data.cryptosConnues.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Prix actuels (relevé du mois)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.cryptosConnues.map((crypto) => {
                    const lastKnown = data.recap.find((r) => r.crypto === crypto)?.prixActuel
                    return (
                      <div key={crypto} className="flex items-center gap-3">
                        <Label className="w-40 shrink-0">{crypto}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-44"
                          placeholder={lastKnown ? String(lastKnown.toFixed(2)) : '0.00'}
                          value={prixInputs[crypto] ?? ''}
                          onChange={(e) =>
                            setPrixInputs((prev) => ({ ...prev, [crypto]: e.target.value }))
                          }
                        />
                        <span className="text-sm text-muted-foreground">€</span>
                        {lastKnown && !prixInputs[crypto] && (
                          <span className="text-xs text-muted-foreground">
                            dernier connu : {fmt(lastKnown)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSavePrix}>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer les prix
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
                        <th className="text-left py-2 pr-4">Crypto</th>
                        <th className="text-right py-2 px-4">Investi ce mois</th>
                        <th className="text-right py-2 px-4">Investi total</th>
                        <th className="text-right py-2 px-4">Quantité totale</th>
                        <th className="text-right py-2 px-4">Prix actuel</th>
                        <th className="text-right py-2 px-4">Valeur actuelle</th>
                        <th className="text-right py-2 pl-4">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recap.map((r) => {
                        const perf = r.performance
                        const perfColor = perf === null ? '' : perf >= 0 ? 'text-green-500' : 'text-red-500'
                        return (
                          <tr key={r.crypto} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{r.crypto}</td>
                            <td className="text-right py-2 px-4 tabular-nums">{fmt(r.investiCeMois)}</td>
                            <td className="text-right py-2 px-4 tabular-nums">{fmt(r.investiTotal)}</td>
                            <td className="text-right py-2 px-4 tabular-nums">{fmtQty(r.quantiteTotale)}</td>
                            <td className="text-right py-2 px-4 tabular-nums">{fmt(r.prixActuel)}</td>
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
                        <td className="text-right py-2 px-4 tabular-nums">{fmt(data.totalInvestiCeMois)}</td>
                        <td className="text-right py-2 px-4 tabular-nums">{fmt(data.totalInvestiDepuisDebut)}</td>
                        <td className="py-2 px-4" />
                        <td className="py-2 px-4" />
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
              </CardContent>
            </Card>
          )}

          {data.cryptosConnues.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>Aucun achat crypto enregistré pour l&apos;instant.</p>
                <p className="text-sm mt-1">Commencez par ajouter un achat ci-dessus.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
