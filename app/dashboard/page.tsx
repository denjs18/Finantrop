'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Settings as SettingsIcon, TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { toast } = useToast()

  const [settingsForm, setSettingsForm] = useState({
    salaireMensuel: '',
    investissementMoyen: '',
    performanceMoyenne: '',
    livrets: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [dashboardRes, settingsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/settings'),
      ])

      if (dashboardRes.ok) {
        const data = await dashboardRes.json()
        setStats(data)
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings(data)
        setSettingsForm({
          salaireMensuel: data.salaireMensuel?.toString() || '',
          investissementMoyen: data.investissementMoyen?.toString() || '',
          performanceMoyenne: data.performanceMoyenne?.toString() || '',
          livrets: data.livrets?.toString() || '',
        })
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salaireMensuel: parseFloat(settingsForm.salaireMensuel),
          investissementMoyen: parseFloat(settingsForm.investissementMoyen),
          performanceMoyenne: parseFloat(settingsForm.performanceMoyenne),
          livrets: parseFloat(settingsForm.livrets),
        }),
      })

      if (res.ok) {
        toast({
          title: 'Succès',
          description: 'Paramètres mis à jour',
        })
        setSettingsOpen(false)
        fetchData()
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de mettre à jour les paramètres',
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">Chargement...</div>
  }

  const patrimoineGlobal = (stats?.patrimoineTotal || 0) + (stats?.totalLivrets || 0)
  const performanceAnnuelle = (stats?.performanceMoyenne || 0.97) * 12

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Vue d&apos;ensemble de votre situation financière
          </p>
        </div>

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Paramètres
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Paramètres</DialogTitle>
              <DialogDescription>
                Configurez vos paramètres financiers
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSettingsSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="salaireMensuel">Salaire mensuel (€)</Label>
                  <Input
                    id="salaireMensuel"
                    type="number"
                    step="0.01"
                    value={settingsForm.salaireMensuel}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, salaireMensuel: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="investissementMoyen">Investissement mensuel moyen (€)</Label>
                  <Input
                    id="investissementMoyen"
                    type="number"
                    step="0.01"
                    value={settingsForm.investissementMoyen}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, investissementMoyen: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="performanceMoyenne">Performance moyenne mensuelle (%)</Label>
                  <Input
                    id="performanceMoyenne"
                    type="number"
                    step="0.01"
                    value={settingsForm.performanceMoyenne}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, performanceMoyenne: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="livrets">Total livrets d&apos;épargne (€)</Label>
                  <Input
                    id="livrets"
                    type="number"
                    step="0.01"
                    value={settingsForm.livrets}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, livrets: e.target.value })
                    }
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Patrimoine Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(patrimoineGlobal)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Bourse + Livrets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Patrimoine Bourse</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.patrimoineTotal || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              PEA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bénéfice/Perte</CardTitle>
            {(stats?.beneficeGlobal || 0) >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.beneficeGlobal || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats?.beneficeGlobal || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Performance: {formatPercentage(stats?.performanceGlobale || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Livrets Épargne</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalLivrets || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Épargne sécurisée
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Évolution du patrimoine</CardTitle>
            <CardDescription>12 derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.evolution12Mois || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="patrimoine"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name="Patrimoine"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résumé financier</CardTitle>
            <CardDescription>Indicateurs clés</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Performance moyenne mensuelle</span>
              <span className="font-bold text-primary">
                {formatPercentage(stats?.performanceMoyenne || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Performance annuelle estimée</span>
              <span className="font-bold text-primary">
                {formatPercentage(performanceAnnuelle)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Investissement mensuel moyen</span>
              <span className="font-bold">
                {formatCurrency(stats?.investissementMoyen || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Investissement annuel</span>
              <span className="font-bold">
                {formatCurrency((stats?.investissementMoyen || 0) * 12)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Dépenses mois en cours</span>
              <span className="font-bold">
                {formatCurrency(stats?.totalFraisMois || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Salaire mensuel</span>
              <span className="font-bold">
                {formatCurrency(settings?.salaireMensuel || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>Accédez rapidement aux fonctionnalités principales</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Button variant="outline" className="h-20" asChild>
            <a href="/budget">
              <div className="flex flex-col items-center gap-2">
                <Wallet className="h-6 w-6" />
                <span>Gérer le budget</span>
              </div>
            </a>
          </Button>
          <Button variant="outline" className="h-20" asChild>
            <a href="/investissements">
              <div className="flex flex-col items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                <span>Investissements</span>
              </div>
            </a>
          </Button>
          <Button variant="outline" className="h-20" asChild>
            <a href="/projections">
              <div className="flex flex-col items-center gap-2">
                <ArrowUpRight className="h-6 w-6" />
                <span>Projections</span>
              </div>
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
