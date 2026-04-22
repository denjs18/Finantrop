import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { IS_MEMORY_MODE, DEMO_USER_ID } from '@/lib/db/memoryDb'

// In memory mode: return a fake session so all routes work without auth
export async function getSession() {
  if (IS_MEMORY_MODE) {
    return { user: { id: DEMO_USER_ID, email: 'demo@finantrop.app', name: 'Démo' } }
  }
  return getServerSession(authOptions)
}
