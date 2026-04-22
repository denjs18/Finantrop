'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils'

// ---------- Types ----------

interface Achat {
  id: string
  mois: string
  indice: string
  quantite: number
  prix: number
  frais: number
}

interface PrixMensuel {
  indice: string
  mois: string
  prix: number
}

// ---------- Données de démonstration ----------

const DEMO_ACHATS: Achat[] = [
  { id: '1', mois: '2026-01', indice: 'MSCI World', quantite: 4, prix: 410.50, frais: 2.00 },
  { id: '2', mois: '2026-01', indice: 'S&P 500', quantite: 2, prix: 520.00, frais: 2.00 },
  { id: '3', mois: '2026-02', indice: 'MSCI World', quantite: 4, prix: 415.00, frais: 2.00 },
  { id: '4', mois: '2026-02', indice: 'S&P 500', quantite: 2, prix: 530.00, frais: 2.00 },
  { id: '5', mois: '2026-02', indice: 'Nasdaq 100', quantite: 1, prix: 480.00, frais: 2.00 },
  { id: '6', mois: '2026-03', indice: 'MSCI World', quantite: 4, prix: 420.00, frais: 2.00 },
  { id: '7', mois: '2026-03', indice: 'S&P 500', quantite: 2, prix: 540.00, frais: 2.00 },
  { id: '8', mois: '2026-03', indice: 'Nasdaq 100', quantite: 1, prix: 490.00, frais: 2.00 },
  { id: '9', mois: '2026-04', indice: 'MSCI World', quantite: 4, prix: 425.00, frais: 2.00 },
  { id: '10', mois: '2026-04', indice: 'S&P 500', quantite: 2, prix: 545.00, frais: 2.00 },
]

const DEMO_PRIX: PrixMensuel[] = [
  { indice: 'MSCI World', mois: '2026-01', prix: 415.00 },
  { indice: 'S&P 500', mois: '2026-01', prix: 525.00 },
  { indice: 'MSCI World', mois: '2026-02', prix: 418.00 },
  { indice: 'S&P 500', mois: '2026-02', prix: 535.00 },
  { indice: 'Nasdaq 100', mois: '2026-02', prix: 485.00 },
  { indice: 'MSCI World', mois: '2026-03', prix: 422.00 },
  { indice: 'S&P 500', mois: '2026-03', prix: 542.00 },
  { indice: 'Nasdaq 100', mois: '2026-03', prix: 492.00 },
  { indice: 'MSCI World', mois: '2026-04', prix: 428.00 },
  { indice: 'S&P 500', mois: '2026-04', prix: 548.00 },
]

// ---------- Helpers ----------

function formatMoisLabel(mois: string): string {
  const [year, month] = mois.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
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

let nextId = 100

const AUTRE_OPTION = '__autre__'

// ---------- Composant principal ----------

export default function DemoPage() {
  const today = moisCourant()
  const [currentMois, setCurrentMois] = useState<string>('2026-04')
  const [achats, setAchats] = useState<Achat[]>(DEMO_ACHATS)
  const [prix, setPrix] = useState<PrixMensuel[]>(DEMO_PRIX)

  const [prixInputs, setPrixInputs] = useState<Record<string, string>>(() => {
    const inputs: Record<string, string> = {}
    DEMO_PRIX.filter((p) => p.mois === '2026-04').forEach((p) => {
      inputs[p.indice] = p.prix.toString()
    })
    return inputs
  })

  const [achatOpen, setAchatOpen] = useState(false)
  const [achatForm, setAchatForm] = useState({
    indiceSelect: '',
    indiceLibre: '',
    quantite: '',
    prix: '',
    frais: '',
  })

  // Indices connus jusqu'à ce mois
  const indicesConnus = [...new Set(
    achats
      .filter((a) => a.mois <= currentMois)
      .map((a) => a.indice)
  )].sort()

  // Achats du mois courant
  const achatsDuMois = achats.filter((a) => a.mois === currentMois)

  // Prix du mois courant
  const prixDuMois = prix.filter((p) => p.mois === currentMois)

  // Map indice -> prix actuel (ce mois ou fallback)
  const prixMap = new Map<string, number>()
  // D'abord le fallback (prix plus anciens)
  const prixTries = [...prix].sort((a, b) => a.mois > b.mois ? -1 : 1)
  for (const p of prixTries) {
    if (p.mois <= currentMois && !prixMap.has(p.indice)) {
      prixMap.set(p.indice, p.prix)
    }
  }
  // Ensuite les prix du mois courant (priorité)
  for (const p of prixDuMois) {
    prixMap.set(p.indice, p.prix)
  }

  // Calcul du récap
  const recap = indicesConnus.map((indice) => {
    const transactionsIndice = achats.filter((a) => a.indice === indice && a.mois <= currentMois)
    const transactionsMois = achatsDuMois.filter((a) => a.indice === indice)

    const quantiteTotale = transactionsIndice.reduce((s, t) => s + t.quantite, 0)
    const investiTotal = transactionsIndice.reduce((s, t) => s + t.quantite * t.prix + t.frais, 0)
    const investiCeMois = transactionsMois.reduce((s, t) => s + t.quantite * t.prix + t.frais, 0)

    const prixActuel = prixMap.get(indice) ?? null
    const valeurActuelle = prixActuel !== null ? quantiteTotale * prixActuel : null
    const performance = valeurActuelle !== null && investiTotal > 0
      ? ((valeurActuelle - investiTotal) / investiTotal) * 100
      : null

    return { indice, investiCeMois, investiTotal, quantiteTotale, prixActuel, valeurActuelle, performance }
  })

  const totalInvestiCeMois = recap.reduce((s, r) => s + r.investiCeMois, 0)
  const totalInvestiDepuisDebut = recap.reduce((s, r) => s + r.investiTotal, 0)
  const hasMissingPrices = recap.some((r) => r.valeurActuelle === null)
  const valeurTotale = recap.length > 0 ? recap.reduce((s, r) => s + (r.valeurActuelle ?? 0), 0) : null

  function handleAddAchat(e: React.FormEvent) {
    e.preventDefault()
    const indice = achatForm.indiceSelect === AUTRE_OPTION
      ? achatForm.indiceLibre.trim()
      : achatForm.indiceSelect
    if (!indice) return

    const nouvelAchat: Achat = {
      id: String(nextId++),
      mois: currentMois,
      indice,
      quantite: parseFloat(achatForm.quantite),
      prix: parseFloat(achatForm.prix),
      frais: parseFloat(achatForm.frais) || 0,
    }
    setAchats((prev) => [...prev, nouvelAchat])
    setAchatOpen(false)
    setAchatForm({ indiceSelect: '', indiceLibre: '', quantite: '', prix: '', frais: '' })
  }

  function handleDeleteAchat(id: string) {
    setAchats((prev) => prev.filter((a) => a.id !== id))
  }

  function handleSavePrix() {
    const nouveauxPrix: PrixMensuel[] = Object.entries(prixInputs)
      .filter(([, v]) => v && parseFloat(v) > 0)
      .map(([indice, v]) => ({ indice, mois: currentMois, prix: parseFloat(v) }))

    setPrix((prev) => {
      const filtré = prev.filter((p) => !(p.mois === currentMois && nouveauxPrix.some((np) => np.indice === p.indice)))
      return [...filtré, ...nouveauxPrix]
    })
  }

  const isNextDisabled = currentMois >= today

  return (
    <div className="min-h-screen bg-background">
      {/* Bandeau démo */}
      <div className="bg-yellow-400 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 text-center py-2 text-sm font-medium">
        Mode démonstration — les données ne sont pas sauvegardées et se réinitialisent au rechargement
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* En-tête */}
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
            {currentMois !== today && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentMois(today)}>
                Aujourd&apos;hui
              </Button>
            )}
          </div>
        </div>

        {/* Section 1 : Achats du mois */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Achats du mois</CardTitle>
              <CardDescription>Indices achetés en {formatMoisLabel(currentMois)}</CardDescription>
            </div>
            <Dialog open={achatOpen} onOpenChange={setAchatOpen}>
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
                          {indicesConnus.map((indice) => (
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
                  </div>
                  <DialogFooter className="mt-4">
                    <Button type="submit">Enregistrer</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {achatsDuMois.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">
                Aucun achat ce mois-ci. Cliquez sur « Ajouter un achat » pour commencer.
              </p>
            ) : (
              <div>
                {achatsDuMois.map((achat) => {
                  const total = achat.quantite * achat.prix + achat.frais
                  return (
                    <div key={achat.id} className="flex items-center justify-between py-3 border-b last:border-0">
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
                          onClick={() => handleDeleteAchat(achat.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
                <div className="flex justify-between items-center pt-3 font-semibold">
                  <span>Total investi ce mois</span>
                  <span>{formatCurrency(totalInvestiCeMois)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2 : Prix du mois */}
        {indicesConnus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Prix du mois</CardTitle>
              <CardDescription>
                Renseignez la valeur actuelle de chaque indice pour {formatMoisLabel(currentMois)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {indicesConnus.map((indice) => {
                  const prixEnregistre = prixDuMois.find((p) => p.indice === indice)
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
                        onChange={(e) => setPrixInputs((prev) => ({ ...prev, [indice]: e.target.value }))}
                        placeholder="Prix €"
                      />
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleSavePrix}>Enregistrer les prix</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 3 : Récapitulatif */}
        {recap.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
              <CardDescription>
                Performance du portefeuille au {formatMoisLabel(currentMois)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasMissingPrices && (
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
                    {recap.map((row) => (
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
                            <span className={`inline-flex items-center gap-1 font-semibold ${row.performance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {row.performance >= 0
                                ? <TrendingUp className="h-3 w-3" />
                                : <TrendingDown className="h-3 w-3" />
                              }
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
                      <td className="text-right py-3">{formatCurrency(totalInvestiCeMois)}</td>
                      <td className="text-right py-3">{formatCurrency(totalInvestiDepuisDebut)}</td>
                      <td className="text-right py-3">
                        {valeurTotale !== null
                          ? `${hasMissingPrices ? '~' : ''}${formatCurrency(valeurTotale)}`
                          : '—'}
                      </td>
                      <td className="text-right py-3">
                        {valeurTotale !== null && totalInvestiDepuisDebut > 0 ? (
                          <span className={`font-bold ${valeurTotale >= totalInvestiDepuisDebut ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(((valeurTotale - totalInvestiDepuisDebut) / totalInvestiDepuisDebut) * 100)}
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

        {indicesConnus.length === 0 && (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">Aucun indice dans votre portefeuille</p>
              <p className="text-sm">Commencez par ajouter votre premier achat.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
