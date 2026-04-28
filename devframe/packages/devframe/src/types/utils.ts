export type Thenable<T> = T | Promise<T>

export type EntriesToObject<T extends readonly [string, any][]> = {
  [K in T[number] as K[0]]: K[1]
}

export type PartialWithoutId<T extends { id: string }> = Partial<Omit<T, 'id'>> & { id: string }
