import { Navbar } from '@/components/navbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto py-6 px-4 md:px-8">
        {children}
      </main>
    </div>
  )
}
