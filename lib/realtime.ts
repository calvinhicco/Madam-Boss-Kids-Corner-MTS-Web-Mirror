import { getInitial as getFirebaseInitial, subscribe as subscribeFirebase, getOne as getFirebaseOne, subscribeOne as subscribeFirebaseOne } from './firebase'

export async function getInitial<T>(tableName: string, forceFresh = false): Promise<T[]> {
  return await getFirebaseInitial<T>(tableName, forceFresh)
}

export function subscribe<T>(tableName: string, cb: (docs: T[]) => void) {
  // Use Firebase subscription instead of Supabase
  return subscribeFirebase<T>(tableName, cb)
}

export async function getOne<T>(tableName: string, id: string): Promise<T | null> {
  return await getFirebaseOne<T>(tableName, id)
}

export function subscribeOne<T>(tableName: string, id: string, cb: (doc: T | null) => void) {
  return subscribeFirebaseOne<T>(tableName, id, cb)
}
