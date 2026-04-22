'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Trash2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { RecapMois, Achat } from '@/types'

function formatMoisLabel(mois: string): string {
  const [year, month] = mois.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
}

function prevMois(mois: string): string {
  const [y, m] = mois.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMois(mois: string): string {
  const [y, m] = mois.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function moisCourant(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

interface MoisData extends RecapMois {
  indicesConnus: string[]
  totalInvestiCeMois: number
  totalInvestiDepuisDebut: number
  hasMissingPrices?: boolean
}

const AUTRE_OPTION = '__autre__'

export default function InvestissementsPage() {
  const today = moisCourant()
  const [currentMois, setCurrentMois] = useState<string>(today)
  const [moisData, setMoisData] = useState<MoisData | null>(null)
  const [loading, setLoading] = useState(true)

  const [prixInputs, setPrixInputs] = useState<Record<string, string>>({})
  const [prixSaving, setPrixSaving] = useState(false)

  const [achatOpen, setAchatOpen] = useState(false)
  const [achatSubmitting, setAchatSubmitting] = useState(false)
  const [achatForm, setAchatForm] = useState({
    indiceSelect: '',
    indiceLibre: '',
    quantite: '',
    prix: '',
    frais: '',
    date: '',
  })

  const { toast } = useToast()

  useEffect(() => {
    fetchMoisData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMois])

  async function fetchMoisData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/investissements/mois?mois=${currentMois}`)
      if (res.ok) {
        const data: MoisData = await res.json()
        setMoisData(data)
        const inputs: Record<string, string> = {}
        data.prix.forEach((p) => {
          inputs[p.indice] = p.prix.toString()
        })
        setPrixInputs(inputs)
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les données' })
    } finally {
      setLoading(false)
    }
  }

  function resetAchatForm() {
    setAchatForm({
      indiceSelect: '',
      indiceLibre: '',
      quantite: '',
      prix: '',
      frais: '',
      date: '',
    })
  }

  async function handleAddAchat(e: React.FormEvent) {
    e.preventDefault()
    const indice = achatForm.indiceSelect === AUTRE_OPTION
      ? achatForm.indiceLibre.trim()
      : achatForm.indiceSelect

    if (!indice) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez renseigner l\'indice' })
      return
    }

    setAchatSubmitting(true)
    try {
      const [annee, moisNum] = currentMois.split('-').map(Number)
      const dateAchat = achatForm.date || new Date(annee, moisNum - 1, 1).toISOString().split('T')[0]

      const res = await fetch('/api/investissements/achat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indice,
          quantite: parseFloat(achatForm.quantite),
          prix: parseFloat(achatForm.prix),
          frais: parseFloat(achatForm.frais) || 0,
          date: dateAchat,
        }),
      })

      if (res.ok) {
        toast({ title: 'Succès', description: 'Achat enregistré' })
        setAchatOpen(false)
        resetAchatForm()
        fetchMoisData()
      } else {
        const err = await res.json()
        toast({ variant: 'destructive', title: 'Erreur', description: err.error ?? 'Erreur lors de l\'ajout' })
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'ajouter l\'achat' })
    } finally {
      setAchatSubmitting(false)
    }
  }

  async function handleDeleteAchat(achat: Achat) {
    try {
      const res = await fetch(`/api/investissements/achat/${achat._id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Succès', description: 'Achat supprimé' })
        fetchMoisData()
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer' })
    }
  }

  async function handleSavePrix() {
    if (!moisData) return
    setPrixSaving(true)
    try {
      const promises = moisData.indicesConnus
        .filter((indice) => prixInputs[indice] && parseFloat(prixInputs[indice]) > 0)
        .map((indice) =>
          fetch('/api/investissements/prix', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ indice, mois: currentMois, prix: parseFloat(prixInputs[indice]) }),
          })
        )
      await Promise.all(promises)
      toast({ title: 'Succès', description: 'Prix enregistrés' })
      fetchMoisData()
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer les prix' })
    } finally {
      setPrixSaving(false)
    }
  }

  const isCurrentMois = currentMois === today
  const isNextDisabled = currentMois >= today

  return (
    <div className="space-y-6">
      {/* En-tête avec navigation par mois */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Investissements PEA</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMois(prevMois(currentMois))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-base font-semibold min-w-[160px] text-center capitalize">
            {formatMoisLabel(currentMois)}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMois(nextMois(currentMois))}
            disabled={isNextDisabled}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentMois && (
            <Button variant="ghost" size="sm" onClick={() => setCurrentMois(today)}>
              Aujourd&apos;hui
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      )}

      {!loading && moisData && (
        <>
          {/* Section 1 : Achats du mois */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Achats du mois</CardTitle>
                <CardDescription>Indices achetés en {formatMoisLabel(currentMois)}</CardDescription>
              </div>
              <Dialog open={achatOpen} onOpenChange={(open) => { setAchatOpen(open); if (!open) resetAchatForm() }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un achat
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter un achat</DialogTitle>
                    <DialogDescription>
                      Enregistrez un achat d&apos;indice pour {formatMoisLabel(currentMois)}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddAchat}>
                    <div className="space-y-4 py-2">
                      <div>
                        <Label>Indice</Label>
                        <Select
                          value={achatForm.indiceSelect}
                          onValueChange={(v) => setAchatForm({ ...achatForm, indiceSelect: v, indiceLibre: '' })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner ou saisir un indice" />
                          </SelectTrigger>
                          <SelectContent>
                            {moisData.indicesConnus.map((indice) => (
                              <SelectItem key={indice} value={indice}>{indice}</SelectItem>
                            ))}
                            <SelectItem value={AUTRE_OPTION}>Autre (nouvel indice)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {achatForm.indiceSelect === AUTRE_OPTION && (
                        <div>
                          <Label>Nom de l&apos;indice</Label>
                          <Input
                            value={achatForm.indiceLibre}
                            onChange={(e) => setAchatForm({ ...achatForm, indiceLibre: e.target.value })}
                            placeholder="ex: Nasdaq 100, MSCI Emerging..."
                            required
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Prix unitaire (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={achatForm.prix}
                            onChange={(e) => setAchatForm({ ...achatForm, prix: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label>Quantité</Label>
                          <Input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={achatForm.quantite}
                            onChange={(e) => setAchatForm({ ...achatForm, quantite: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Frais (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={achatForm.frais}
                            onChange={(e) => setAchatForm({ ...achatForm, frais: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={achatForm.date}
                            onChange={(e) => setAchatForm({ ...achatForm, date: e.target.value })}
                            placeholder="Début du mois par défaut"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="mt-4">
                      <Button type="submit" disabled={achatSubmitting}>
                        {achatSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {moisData.achats.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">
                  Aucun achat ce mois-ci. Cliquez sur « Ajouter un achat » pour commencer.
                </p>
              ) : (
                <div className="space-y-0">
                  {moisData.achats.map((achat) => {
                    const total = achat.quantite * achat.prix + achat.frais
                    return (
                      <div key={achat._id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <p className="font-medium">{achat.indice}</p>
                          <p className="text-sm text-muted-foreground">
                            {achat.quantite} parts × {formatCurrency(achat.prix)}
                            {achat.frais > 0 && ` + ${formatCurrency(achat.frais)} frais`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{formatCurrency(total)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteAchat(achat)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  <div className="flex justify-between items-center pt-3 font-semibold">
                    <span>Total investi ce mois</span>
                    <span>{formatCurrency(moisData.totalInvestiCeMois)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2 : Prix du mois */}
          {moisData.indicesConnus.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Prix du mois</CardTitle>
                <CardDescription>
                  Renseignez la valeur actuelle de chaque indice pour {formatMoisLabel(currentMois)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {moisData.indicesConnus.map((indice) => {
                    const prixEnregistre = moisData.prix.find((p) => p.indice === indice)
                    return (
                      <div key={indice} className="flex items-center gap-4">
                        <span className="flex-1 font-medium">{indice}</span>
                        {prixEnregistre && (
                          <span className="text-sm text-muted-foreground">
                            Enregistré : {formatCurrency(prixEnregistre.prix)}
                          </span>
                        )}
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="w-32 text-right"
                          value={prixInputs[indice] ?? ''}
                          onChange={(e) =>
                            setPrixInputs((prev) => ({ ...prev, [indice]: e.target.value }))
                          }
                          placeholder="Prix €"
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleSavePrix} disabled={prixSaving}>
                    {prixSaving ? 'Enregistrement...' : 'Enregistrer les prix'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 3 : Récapitulatif */}
          {moisData.recap.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Récapitulatif</CardTitle>
                <CardDescription>
                  Performance du portefeuille au {formatMoisLabel(currentMois)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {moisData.hasMissingPrices && (
                  <div className="mb-4 px-3 py-2 rounded-md bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 text-sm">
                    Certains indices n&apos;ont pas de prix pour ce mois. La valorisation est partielle.
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 font-medium">Indice</th>
                        <th className="text-right py-2 font-medium">Ce mois</th>
                        <th className="text-right py-2 font-medium">Total investi</th>
                        <th className="text-right py-2 font-medium">Valeur actuelle</th>
                        <th className="text-right py-2 font-medium">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moisData.recap.map((row) => (
                        <tr key={row.indice} className="border-b hover:bg-accent/30">
                          <td className="py-3 font-medium">{row.indice}</td>
                          <td className="text-right py-3">
                            {row.investiCeMois > 0 ? formatCurrency(row.investiCeMois) : '—'}
                          </td>
                          <td className="text-right py-3">{formatCurrency(row.investiTotal)}</td>
                          <td className="text-right py-3">
                            {row.valeurActuelle !== null ? formatCurrency(row.valeurActuelle) : '—'}
                          </td>
                          <td className="text-right py-3">
                            {row.performance !== null ? (
                              <span
                                className={`inline-flex items-center gap-1 font-semibold ${
                                  row.performance >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {row.performance >= 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {formatPercentage(row.performance)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td className="py-3">Total</td>
                        <td className="text-right py-3">{formatCurrency(moisData.totalInvestiCeMois)}</td>
                        <td className="text-right py-3">{formatCurrency(moisData.totalInvestiDepuisDebut)}</td>
                        <td className="text-right py-3">
                          {moisData.valeurTotale !== null
                            ? `${moisData.hasMissingPrices ? '~' : ''}${formatCurrency(moisData.valeurTotale)}`
                            : '—'}
                        </td>
                        <td className="text-right py-3">
                          {moisData.valeurTotale !== null && moisData.totalInvestiDepuisDebut > 0 ? (
                            <span
                              className={`font-bold ${
                                moisData.valeurTotale >= moisData.totalInvestiDepuisDebut
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {formatPercentage(
                                ((moisData.valeurTotale - moisData.totalInvestiDepuisDebut) /
                                  moisData.totalInvestiDepuisDebut) *
                                  100
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Aucun indice encore */}
          {moisData.indicesConnus.length === 0 && (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <p className="text-lg mb-2">Aucun indice dans votre portefeuille</p>
                <p className="text-sm">Commencez par ajouter votre premier achat.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
