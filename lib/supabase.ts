import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Database types
export interface Staff {
  id: string
  name: string
  role: string
  contact: string
  email?: string
  date_joined: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface StaffLog {
  id: string
  staff_id: string
  staff_name: string
  role: string
  date: string
  time_in?: string
  time_out?: string
  duties: string
  notes: string
  is_present: boolean
  created_at?: string
  updated_at?: string
}

export interface Student {
  id: string
  name: string
  grade: string
  parent_name: string
  contact: string
  email?: string
  address?: string
  date_enrolled: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// Realtime subscription helpers
export function subscribeToTable<T>(
  table: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`public:${table}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      callback
    )
    .subscribe()
}

export async function getTableData<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error(`Error fetching ${table}:`, error)
    return []
  }
  
  return data || []
}

export async function insertData<T>(table: string, data: Partial<T>) {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single()
  
  if (error) {
    console.error(`Error inserting into ${table}:`, error)
    throw error
  }
  
  return result
}

export async function updateData<T>(
  table: string, 
  id: string, 
  data: Partial<T>
) {
  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error(`Error updating ${table}:`, error)
    throw error
  }
  
  return result
}

export async function deleteData(table: string, id: string) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error(`Error deleting from ${table}:`, error)
    throw error
  }
}
