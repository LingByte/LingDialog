interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class OverviewCache {
  private configCache = new Map<number, CacheEntry<any>>()
  private statsCache = new Map<number, CacheEntry<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5分钟

  getConfig(organizationId: number): any | null {
    const entry = this.configCache.get(organizationId)
    if (!entry) return null
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.configCache.delete(organizationId)
      return null
    }
    return entry.data
  }

  setConfig(organizationId: number, data: any, ttl?: number): void {
    this.configCache.set(organizationId, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  getStats(organizationId: number): any | null {
    const entry = this.statsCache.get(organizationId)
    if (!entry) return null
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.statsCache.delete(organizationId)
      return null
    }
    return entry.data
  }

  setStats(organizationId: number, data: any, ttl?: number): void {
    this.statsCache.set(organizationId, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  clear(organizationId?: number): void {
    if (organizationId) {
      this.configCache.delete(organizationId)
      this.statsCache.delete(organizationId)
    } else {
      this.configCache.clear()
      this.statsCache.clear()
    }
  }
}

export const overviewCache = new OverviewCache()

