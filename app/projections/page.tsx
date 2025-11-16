'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp } from 'lucide-react'

interface ProjectionData {
  annees: number
  valeur: number
  investissementTotal: number
  gains: number
}

export default function ProjectionsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [portfolio, setPortfolio] = useState<any[]>([])
  const [projections, setProjections] = useState<ProjectionData[]>([])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    try {
      const [settingsRes, portfolioRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/investissements/portfolio'),
      ])

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings(data)
        calculateProjections(data, await portfolioRes.json())
      }

      if (portfolioRes.ok) {
        const data = await portfolioRes.json()
        setPortfolio(data)
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const calculateProjections = (settings: any, portfolio: any[]) => {
    const valeurActuelle = portfolio.reduce((sum, item) => {
      const prixActuel = item.prixActuel || item.prixMoyenAchat
      return sum + (item.quantite * prixActuel)
    }, 0)

    const investissementMensuel = settings.investissementMoyen || 465
    const performanceMensuelle = (settings.performanceMoyenne || 0.97) / 100

    const projectionYears = [10, 20, 30, 40, 50]
    const projectionsData: ProjectionData[] = []

    let valeurCourante = valeurActuelle

    for (let annee = 1; annee <= 50; annee++) {
      for (let mois = 1; mois <= 12; mois++) {
        valeurCourante += investissementMensuel
        valeurCourante *= (1 + performanceMensuelle)
      }

      if (projectionYears.includes(annee)) {
        const investissementTotal = valeurActuelle + (investissementMensuel * 12 * annee)
        const gains = valeurCourante - investissementTotal

        projectionsData.push({
          annees: annee,
          valeur: valeurCourante,
          investissementTotal,
          gains,
        })
      }
    }

    setProjections(projectionsData)
  }

  const graphData = projections.map(p => ({
    annees: `${p.annees} ans`,
    'Valeur totale': Math.round(p.valeur),
    'Investissement': Math.round(p.investissementTotal),
    'Gains': Math.round(p.gains),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Projections Long Terme</h1>
        <p className="text-muted-foreground mt-1">
          Simulation de croissance de votre portefeuille sur 10 à 50 ans
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Performance moyenne mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((settings?.performanceMoyenne || 0.97)).toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((settings?.performanceMoyenne || 0.97) * 12).toFixed(2)}% par an
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Investissement mensuel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(settings?.investissementMoyen || 465)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency((settings?.investissementMoyen || 465) * 12)} par an
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Valeur actuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                portfolio.reduce((sum, item) => {
                  const prixActuel = item.prixActuel || item.prixMoyenAchat
                  return sum + (item.quantite * prixActuel)
                }, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Base de calcul
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Courbe de projection</CardTitle>
          <CardDescription>
            Évolution estimée de votre patrimoine avec investissements réguliers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="annees" />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="Valeur totale"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Investissement"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="Gains"
                stroke="#16a34a"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tableau des projections</CardTitle>
          <CardDescription>
            Détails des estimations à long terme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Période</th>
                  <th className="text-right py-3 px-2">Investissement total</th>
                  <th className="text-right py-3 px-2">Gains</th>
                  <th className="text-right py-3 px-2">Valeur totale</th>
                  <th className="text-right py-3 px-2">Rendement</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((projection) => {
                  const rendement = projection.investissementTotal > 0
                    ? ((projection.gains / projection.investissementTotal) * 100)
                    : 0

                  return (
                    <tr key={projection.annees} className="border-b hover:bg-accent/50">
                      <td className="py-4 px-2 font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        {projection.annees} ans
                      </td>
                      <td className="text-right py-4 px-2">
                        {formatCurrency(projection.investissementTotal)}
                      </td>
                      <td className="text-right py-4 px-2 font-semibold text-green-600">
                        {formatCurrency(projection.gains)}
                      </td>
                      <td className="text-right py-4 px-2 font-bold text-lg text-primary">
                        {formatCurrency(projection.valeur)}
                      </td>
                      <td className="text-right py-4 px-2 font-semibold text-green-600">
                        +{rendement.toFixed(0)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            Note importante
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>
            Ces projections sont basées sur une performance moyenne mensuelle de{' '}
            <strong>{((settings?.performanceMoyenne || 0.97)).toFixed(2)}%</strong> et un
            investissement régulier de{' '}
            <strong>{formatCurrency(settings?.investissementMoyen || 465)}</strong> par mois.
          </p>
          <p>
            Les résultats réels peuvent varier considérablement en fonction des conditions de marché.
            Ces estimations ne constituent pas un conseil en investissement.
          </p>
          <p className="font-semibold mt-4">
            Les performances passées ne préjugent pas des performances futures.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
