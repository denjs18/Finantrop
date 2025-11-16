'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatPercentage, formatDate } from '@/lib/utils'
import { PortfolioItem, Transaction } from '@/types'

const actionsDisponibles = [
  'S&P 500',
  'MSCI World',
  'Airbus',
  'STMicroelectronics',
  'Dassault Systèmes',
  'Carrefour',
  'Sword Group',
  'Alstom',
  'Autre',
]

export default function InvestissementsPage() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    type: 'achat' as 'achat' | 'vente',
    action: '',
    autreAction: '',
    quantite: '',
    prix: '',
    frais: '',
    date: new Date().toISOString().split('T')[0],
  })

  const [prixActuels, setPrixActuels] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [portfolioRes, transactionsRes] = await Promise.all([
        fetch('/api/investissements/portfolio'),
        fetch('/api/investissements/transactions'),
      ])

      if (portfolioRes.ok) {
        const data = await portfolioRes.json()
        setPortfolio(data)
        const prix: { [key: string]: string } = {}
        data.forEach((item: PortfolioItem) => {
          if (item.prixActuel) {
            prix[item.action] = item.prixActuel.toString()
          }
        })
        setPrixActuels(prix)
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json()
        setTransactions(data)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const actionName = formData.action === 'Autre' ? formData.autreAction : formData.action

    if (!actionName) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez spécifier le nom de l&apos;action',
      })
      return
    }

    try {
      const res = await fetch('/api/investissements/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          action: actionName,
          quantite: parseFloat(formData.quantite),
          prix: parseFloat(formData.prix),
          frais: parseFloat(formData.frais) || 0,
          date: formData.date,
        }),
      })

      if (res.ok) {
        toast({
          title: 'Succès',
          description: 'Transaction ajoutée',
        })
        setOpen(false)
        setFormData({
          type: 'achat',
          action: '',
          autreAction: '',
          quantite: '',
          prix: '',
          frais: '',
          date: new Date().toISOString().split('T')[0],
        })
        fetchData()
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d&apos;ajouter la transaction',
      })
    }
  }

  const handleUpdatePrix = async (action: string) => {
    const prixActuel = parseFloat(prixActuels[action])
    if (!prixActuel || prixActuel <= 0) return

    try {
      const res = await fetch('/api/investissements/portfolio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, prixActuel }),
      })

      if (res.ok) {
        toast({
          title: 'Succès',
          description: 'Prix mis à jour',
        })
        fetchData()
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de mettre à jour le prix',
      })
    }
  }

  const valeurTotale = portfolio.reduce((sum, item) => {
    const prixActuel = item.prixActuel || item.prixMoyenAchat
    return sum + (item.quantite * prixActuel)
  }, 0)

  const coutTotal = portfolio.reduce((sum, item) => {
    return sum + (item.quantite * item.prixMoyenAchat) + item.fraisTotal
  }, 0)

  const beneficeGlobal = valeurTotale - coutTotal
  const performanceGlobale = coutTotal > 0 ? ((beneficeGlobal / coutTotal) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Investissements (PEA)</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle transaction</DialogTitle>
              <DialogDescription>
                Enregistrez un achat ou une vente d&apos;action
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v: 'achat' | 'vente') =>
                      setFormData({ ...formData, type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="achat">Achat</SelectItem>
                      <SelectItem value="vente">Vente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="action">Action</Label>
                  <Select
                    value={formData.action}
                    onValueChange={(v) => setFormData({ ...formData, action: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une action" />
                    </SelectTrigger>
                    <SelectContent>
                      {actionsDisponibles.map((action) => (
                        <SelectItem key={action} value={action}>
                          {action}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.action === 'Autre' && (
                  <div>
                    <Label htmlFor="autreAction">Nom de l&apos;action</Label>
                    <Input
                      id="autreAction"
                      type="text"
                      value={formData.autreAction}
                      onChange={(e) => setFormData({ ...formData, autreAction: e.target.value })}
                      required
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="quantite">Quantité</Label>
                  <Input
                    id="quantite"
                    type="number"
                    step="0.01"
                    value={formData.quantite}
                    onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="prix">Prix unitaire (€)</Label>
                  <Input
                    id="prix"
                    type="number"
                    step="0.01"
                    value={formData.prix}
                    onChange={(e) => setFormData({ ...formData, prix: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="frais">Frais (€)</Label>
                  <Input
                    id="frais"
                    type="number"
                    step="0.01"
                    value={formData.frais}
                    onChange={(e) => setFormData({ ...formData, frais: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit">Enregistrer</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Valeur Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(valeurTotale)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bénéfice/Perte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${beneficeGlobal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {beneficeGlobal >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {formatCurrency(beneficeGlobal)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${performanceGlobale >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(performanceGlobale)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="portfolio" className="space-y-4">
        <TabsList>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="transactions">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mon Portfolio</CardTitle>
              <CardDescription>Liste de vos actions détenues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Action</th>
                      <th className="text-right py-3 px-2">Quantité</th>
                      <th className="text-right py-3 px-2">Prix moyen</th>
                      <th className="text-right py-3 px-2">Prix actuel</th>
                      <th className="text-right py-3 px-2">Valeur</th>
                      <th className="text-right py-3 px-2">Performance</th>
                      <th className="text-right py-3 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((item) => {
                      const prixActuel = item.prixActuel || item.prixMoyenAchat
                      const valeur = item.quantite * prixActuel
                      const cout = (item.quantite * item.prixMoyenAchat) + item.fraisTotal
                      const benefice = valeur - cout
                      const performance = cout > 0 ? ((benefice / cout) * 100) : 0

                      return (
                        <tr key={item._id} className="border-b hover:bg-accent/50">
                          <td className="py-3 px-2 font-medium">{item.action}</td>
                          <td className="text-right py-3 px-2">{item.quantite}</td>
                          <td className="text-right py-3 px-2">{formatCurrency(item.prixMoyenAchat)}</td>
                          <td className="text-right py-3 px-2">
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={prixActuels[item.action] || ''}
                                onChange={(e) =>
                                  setPrixActuels({ ...prixActuels, [item.action]: e.target.value })
                                }
                                className="w-24 h-8 text-right"
                                placeholder={prixActuel.toFixed(2)}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleUpdatePrix(item.action)}
                                className="h-8"
                              >
                                MAJ
                              </Button>
                            </div>
                          </td>
                          <td className="text-right py-3 px-2 font-semibold">
                            {formatCurrency(valeur)}
                          </td>
                          <td className={`text-right py-3 px-2 font-semibold ${performance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(performance)}
                          </td>
                          <td className="text-right py-3 px-2">
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(benefice)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {portfolio.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    Aucune action dans votre portfolio
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des transactions</CardTitle>
              <CardDescription>Liste de tous vos achats et ventes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune transaction</p>
                ) : (
                  transactions.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="flex justify-between items-center py-3 border-b"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              transaction.type === 'achat'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}
                          >
                            {transaction.type.toUpperCase()}
                          </span>
                          <p className="font-medium">{transaction.action}</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(transaction.date)} • {transaction.quantite} actions à{' '}
                          {formatCurrency(transaction.prix)}
                          {transaction.frais > 0 && ` • Frais: ${formatCurrency(transaction.frais)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(transaction.quantite * transaction.prix + transaction.frais)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
