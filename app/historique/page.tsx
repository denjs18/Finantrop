'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Download, Plus, Calculator } from 'lucide-react'
import { formatCurrency, exportToCSV } from '@/lib/utils'
import { MoisRecap } from '@/types'

export default function HistoriquePage() {
  const [historique, setHistorique] = useState<MoisRecap[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    mois: '',
    annee: '',
    totalFrais: '',
    salaire: '',
    epargneBourse: '',
    epargneLivrets: '',
  })

  useEffect(() => {
    fetchHistorique()
  }, [])

  const fetchHistorique = async () => {
    try {
      const res = await fetch('/api/historique')
      if (res.ok) {
        const data = await res.json()
        setHistorique(data)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const reste =
      parseFloat(formData.salaire) -
      parseFloat(formData.totalFrais) -
      parseFloat(formData.epargneBourse)

    try {
      const res = await fetch('/api/historique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mois: parseInt(formData.mois),
          annee: parseInt(formData.annee),
          totalFrais: parseFloat(formData.totalFrais),
          salaire: parseFloat(formData.salaire),
          epargneBourse: parseFloat(formData.epargneBourse),
          epargneLivrets: parseFloat(formData.epargneLivrets),
          reste,
        }),
      })

      if (res.ok) {
        toast({
          title: 'Succès',
          description: 'Récapitulatif ajouté',
        })
        setOpen(false)
        setFormData({
          mois: '',
          annee: '',
          totalFrais: '',
          salaire: '',
          epargneBourse: '',
          epargneLivrets: '',
        })
        fetchHistorique()
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'ajouter le récapitulatif',
      })
    }
  }

  const handleAutoCalculate = async () => {
    if (!formData.mois || !formData.annee) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner un mois et une année',
      })
      return
    }

    try {
      const res = await fetch(
        `/api/historique?mois=${formData.mois}&annee=${formData.annee}`,
        { method: 'PUT' }
      )

      if (res.ok) {
        toast({
          title: 'Succès',
          description: 'Calcul automatique effectué',
        })
        setOpen(false)
        fetchHistorique()
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de calculer automatiquement',
      })
    }
  }

  const handleExport = () => {
    const data = historique.map((h) => ({
      Mois: `${h.mois}/${h.annee}`,
      'Total Frais': h.totalFrais,
      Salaire: h.salaire,
      'Épargne Bourse': h.epargneBourse,
      'Épargne Livrets': h.epargneLivrets,
      Reste: h.reste,
      Statut: h.reste >= 0 ? 'Positif' : 'Négatif',
    }))

    exportToCSV(data, `historique-mensuel-${new Date().toISOString().split('T')[0]}.csv`)

    toast({
      title: 'Succès',
      description: 'Historique exporté en CSV',
    })
  }

  const totalEpargneBourse = historique.reduce((sum, h) => sum + h.epargneBourse, 0)
  const totalEpargneLivrets = historique.reduce((sum, h) => sum + h.epargneLivrets, 0)
  const totalSalaires = historique.reduce((sum, h) => sum + h.salaire, 0)
  const totalFrais = historique.reduce((sum, h) => sum + h.totalFrais, 0)

  const getMoisNom = (mois: number) => {
    return new Date(2024, mois - 1).toLocaleDateString('fr-FR', { month: 'long' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Historique Mensuel</h1>
          <p className="text-muted-foreground mt-1">
            Vue chronologique de vos mois depuis janvier 2024
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau récapitulatif mensuel</DialogTitle>
                <DialogDescription>
                  Ajoutez ou calculez automatiquement un récapitulatif
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mois">Mois</Label>
                      <Input
                        id="mois"
                        type="number"
                        min="1"
                        max="12"
                        value={formData.mois}
                        onChange={(e) => setFormData({ ...formData, mois: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="annee">Année</Label>
                      <Input
                        id="annee"
                        type="number"
                        min="2024"
                        value={formData.annee}
                        onChange={(e) => setFormData({ ...formData, annee: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleAutoCalculate}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculer automatiquement depuis les dépenses
                  </Button>

                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Ou saisir manuellement :
                    </p>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="totalFrais">Total frais (€)</Label>
                        <Input
                          id="totalFrais"
                          type="number"
                          step="0.01"
                          value={formData.totalFrais}
                          onChange={(e) =>
                            setFormData({ ...formData, totalFrais: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="salaire">Salaire (€)</Label>
                        <Input
                          id="salaire"
                          type="number"
                          step="0.01"
                          value={formData.salaire}
                          onChange={(e) =>
                            setFormData({ ...formData, salaire: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="epargneBourse">Épargne bourse (€)</Label>
                        <Input
                          id="epargneBourse"
                          type="number"
                          step="0.01"
                          value={formData.epargneBourse}
                          onChange={(e) =>
                            setFormData({ ...formData, epargneBourse: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="epargneLivrets">Épargne livrets (€)</Label>
                        <Input
                          id="epargneLivrets"
                          type="number"
                          step="0.01"
                          value={formData.epargneLivrets}
                          onChange={(e) =>
                            setFormData({ ...formData, epargneLivrets: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="submit">Enregistrer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Salaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSalaires)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Frais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFrais)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Épargne Bourse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalEpargneBourse)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Épargne Livrets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalEpargneLivrets)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Récapitulatif mensuel</CardTitle>
          <CardDescription>
            Liste chronologique de vos mois (du plus récent au plus ancien)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Période</th>
                  <th className="text-right py-3 px-2">Total Frais</th>
                  <th className="text-right py-3 px-2">Salaire</th>
                  <th className="text-right py-3 px-2">Épargne Bourse</th>
                  <th className="text-right py-3 px-2">Épargne Livrets</th>
                  <th className="text-right py-3 px-2">Reste</th>
                  <th className="text-center py-3 px-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {historique.map((recap) => (
                  <tr key={recap._id} className="border-b hover:bg-accent/50">
                    <td className="py-3 px-2 font-medium">
                      {getMoisNom(recap.mois)} {recap.annee}
                    </td>
                    <td className="text-right py-3 px-2">{formatCurrency(recap.totalFrais)}</td>
                    <td className="text-right py-3 px-2">{formatCurrency(recap.salaire)}</td>
                    <td className="text-right py-3 px-2 text-green-600">
                      {formatCurrency(recap.epargneBourse)}
                    </td>
                    <td className="text-right py-3 px-2 text-green-600">
                      {formatCurrency(recap.epargneLivrets)}
                    </td>
                    <td
                      className={`text-right py-3 px-2 font-semibold ${
                        recap.reste >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(recap.reste)}
                    </td>
                    <td className="text-center py-3 px-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          recap.reste >= 0
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {recap.reste >= 0 ? 'Positif' : 'Négatif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {historique.length === 0 && (
              <p className="text-center py-8 text-muted-foreground">
                Aucun récapitulatif mensuel
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
