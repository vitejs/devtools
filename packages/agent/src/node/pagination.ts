import { z } from 'zod'

export const page = {
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
}

export const edgePage = {
  importsOffset: z.number().int().min(0).default(0),
  importsLimit: z.number().int().min(1).max(100).default(20),
  importersOffset: z.number().int().min(0).default(0),
  importersLimit: z.number().int().min(1).max(100).default(20),
}

export function paginate<T>(items: T[], offset: number, limit: number) {
  return { items: items.slice(offset, offset + limit), total: items.length, offset, limit, hasMore: offset + limit < items.length }
}
