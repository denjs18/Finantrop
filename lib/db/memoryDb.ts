// In-memory store used when MONGODB_URI is not set.
// Data is scoped to the Node.js process — it resets on cold starts.

type Doc = Record<string, any> & { _id: string }
type Filter = Record<string, any>
type Collection = Map<string, Doc>

declare global {
  var __memDb: Record<string, Collection> | undefined
}

if (!global.__memDb) global.__memDb = {}

export function col(name: string): Collection {
  if (!global.__memDb![name]) global.__memDb![name] = new Map()
  return global.__memDb![name]
}

export function genId(): string {
  return `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

function matchValue(docVal: any, filterVal: any): boolean {
  if (filterVal instanceof Date) {
    const dv = docVal instanceof Date ? docVal.getTime() : new Date(docVal).getTime()
    return dv === filterVal.getTime()
  }
  if (filterVal !== null && typeof filterVal === 'object' && !Array.isArray(filterVal)) {
    for (const [op, opVal] of Object.entries(filterVal)) {
      const dv = docVal instanceof Date ? docVal.getTime() : docVal
      const ov = opVal instanceof Date ? (opVal as Date).getTime() : opVal
      switch (op) {
        case '$lt':  if (!(dv <  ov)) return false; break
        case '$lte': if (!(dv <= ov)) return false; break
        case '$gt':  if (!(dv >  ov)) return false; break
        case '$gte': if (!(dv >= ov)) return false; break
        case '$in':  if (!(opVal as any[]).some((v) => matchValue(docVal, v))) return false; break
        case '$ne':  if (dv === ov) return false; break
      }
    }
    return true
  }
  return (docVal?.toString?.() ?? docVal) === (filterVal?.toString?.() ?? filterVal)
}

function matchDoc(doc: Doc, filter: Filter): boolean {
  return Object.entries(filter).every(([k, v]) => matchValue(doc[k], v))
}

function applySort(docs: Doc[], spec: Record<string, number>): Doc[] {
  const entries = Object.entries(spec)
  if (!entries.length) return docs
  return [...docs].sort((a, b) => {
    for (const [field, dir] of entries) {
      const av = a[field] instanceof Date ? a[field].getTime() : a[field]
      const bv = b[field] instanceof Date ? b[field].getTime() : b[field]
      if (av < bv) return dir === 1 ? -1 : 1
      if (av > bv) return dir === 1 ? 1 : -1
    }
    return 0
  })
}

// Thenable query builder to support `.find().sort()` chaining
class QueryChain {
  private _sort: Record<string, number> = {}
  constructor(private docs: Doc[]) {}

  sort(spec: Record<string, number>): this {
    this._sort = spec
    return this
  }

  then(resolve: (v: Doc[]) => any, reject?: (e: any) => any) {
    try { resolve(applySort(this.docs, this._sort)) } catch (e) { reject?.(e) }
  }
}

export class MemoryCollection {
  constructor(private name: string) {}

  find(filter: Filter = {}): QueryChain {
    const docs = [...col(this.name).values()].filter((d) => matchDoc(d, filter))
    return new QueryChain(docs)
  }

  async findOne(filter: Filter): Promise<Doc | null> {
    for (const doc of col(this.name).values()) {
      if (matchDoc(doc, filter)) return doc
    }
    return null
  }

  async create(data: Record<string, any>): Promise<Doc> {
    const now = new Date()
    const doc: Doc = { createdAt: now, updatedAt: now, ...data, _id: data._id ?? genId() }
    col(this.name).set(doc._id, doc)
    return doc
  }

  async findOneAndUpdate(
    filter: Filter,
    update: Record<string, any>,
    options: { upsert?: boolean; new?: boolean } = {}
  ): Promise<Doc | null> {
    for (const [id, doc] of col(this.name)) {
      if (matchDoc(doc, filter)) {
        const updated = { ...doc, ...update, updatedAt: new Date() }
        col(this.name).set(id, updated)
        return options.new ? updated : doc
      }
    }
    if (options.upsert) {
      const created = await this.create({ ...filter, ...update })
      return options.new ? created : null
    }
    return null
  }

  async findOneAndDelete(filter: Filter): Promise<Doc | null> {
    for (const [id, doc] of col(this.name)) {
      if (matchDoc(doc, filter)) {
        col(this.name).delete(id)
        return doc
      }
    }
    return null
  }

  async deleteOne(filter: Filter): Promise<{ deletedCount: number }> {
    for (const [id, doc] of col(this.name)) {
      if (matchDoc(doc, filter)) {
        col(this.name).delete(id)
        return { deletedCount: 1 }
      }
    }
    return { deletedCount: 0 }
  }

  async aggregate<T = any>(pipeline: any[]): Promise<T[]> {
    let docs: any[] = [...col(this.name).values()]
    for (const stage of pipeline) {
      if (stage.$match) docs = docs.filter((d) => matchDoc(d, stage.$match))
      else if (stage.$sort) docs = applySort(docs, stage.$sort)
      else if (stage.$group) {
        const idExpr: string = stage.$group._id
        const field = idExpr.startsWith('$') ? idExpr.slice(1) : '_id'
        const grouped = new Map<string, any>()
        for (const doc of docs) {
          const key = String(doc[field])
          if (!grouped.has(key)) {
            const groupDoc: any = { _id: doc[field] }
            for (const [f, expr] of Object.entries<any>(stage.$group)) {
              if (f === '_id') continue
              if (expr.$first?.startsWith?.('$')) groupDoc[f] = doc[expr.$first.slice(1)]
              else if (expr.$sum !== undefined) groupDoc[f] = 0
            }
            grouped.set(key, groupDoc)
          }
        }
        docs = [...grouped.values()]
      }
    }
    return docs as T[]
  }
}

export const IS_MEMORY_MODE = !process.env.MONGODB_URI
export const DEMO_USER_ID = 'demo00000000000000000000'
