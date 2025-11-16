'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Depense, DepenseCategorie } from '@/types'

const categories: { value: DepenseCategorie; label: string }[] = [
  { value: 'loyer', label: 'Loyer' },
  { value: 'electricite_gaz', label: 'Électricité/Gaz' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'sport', label: 'Sport' },
  { value: 'voiture_logement', label: 'Voiture/Logement' },
  { value: 'courses', label: 'Courses' },
  { value: 'essence', label: 'Essence' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'autres', label: 'Autres' },
]

export default function BudgetPage() {
  const [depenses, setDepenses] = useState<Depense[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const { toast } = useToast()

  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    categorie: 'courses' as DepenseCategorie,
    montant: '',
    description: '',
  })

  useEffect(() => {
    fetchDepenses()
    fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const fetchDepenses = async () => {
    try {
      const res = await fetch(`/api/budget?mois=${selectedMonth}&annee=${selectedYear}`)
      if (res.ok) {
        const data = await res.json()
        setDepenses(data)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          montant: parseFloat(formData.montant),
        }),
      })

      if (res.ok) {
        toast({
          title: 'Succès',
          description: 'Dépense ajoutée',
        })
        setOpen(false)
        setFormData({
          date: new Date().toISOString().split('T')[0],
          categorie: 'courses',
          montant: '',
          description: '',
        })
        fetchDepenses()
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'ajouter la dépense',
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/budget/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast({
          title: 'Succès',
          description: 'Dépense supprimée',
        })
        fetchDepenses()
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de supprimer la dépense',
      })
    }
  }

  const totalFrais = depenses.reduce((sum, d) => sum + d.montant, 0)
  const salaire = settings?.salaireMensuel || 0
  const epargneBourse = settings?.investissementMoyen || 0
  const reste = salaire - totalFrais - epargneBourse

  const depensesParCategorie = categories.map(cat => ({
    ...cat,
    total: depenses
      .filter(d => d.categorie === cat.value)
      .reduce((sum, d) => sum + d.montant, 0),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Budget Mensuel</h1>

        <div className="flex items-center gap-2">
          <Select
            value={selectedMonth.toString()}
            onValueChange={(v) => setSelectedMonth(parseInt(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {new Date(2024, i).toLocaleDateString('fr-FR', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => (
                <SelectItem key={i} value={(2024 + i).toString()}>
                  {2024 + i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle dépense</DialogTitle>
                <DialogDescription>
                  Ajoutez une nouvelle dépense à votre budget
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
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
                  <div>
                    <Label htmlFor="categorie">Catégorie</Label>
                    <Select
                      value={formData.categorie}
                      onValueChange={(v: DepenseCategorie) =>
                        setFormData({ ...formData, categorie: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="montant">Montant (€)</Label>
                    <Input
                      id="montant"
                      type="number"
                      step="0.01"
                      value={formData.montant}
                      onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="submit">Ajouter</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Salaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salaire)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Épargne Bourse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(epargneBourse)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Reste</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${reste >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(reste)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dépenses par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {depensesParCategorie.map((cat) => (
                <div key={cat.value} className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">{cat.label}</span>
                  <span className="font-semibold">{formatCurrency(cat.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dernières dépenses</CardTitle>
            <CardDescription>Liste de vos dépenses récentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {depenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune dépense pour ce mois</p>
              ) : (
                depenses.map((depense) => (
                  <div
                    key={depense._id}
                    className="flex justify-between items-center py-2 border-b"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {categories.find((c) => c.value === depense.categorie)?.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(depense.date)}
                        {depense.description && ` - ${depense.description}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatCurrency(depense.montant)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(depense._id!)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
