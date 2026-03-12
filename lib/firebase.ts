import { initializeApp } from 'firebase/app'
import { getFirestore, collection, onSnapshot, doc, getDocs, query, orderBy, enableNetwork, disableNetwork, clearIndexedDbPersistence } from 'firebase/firestore'

// Firebase configuration - matches the Electron app's Firebase project
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const firebaseConfig = {
  apiKey: requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: requireEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: requireEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requireEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export { db }

// Ultra-aggressive cache clearing for emergency situations (factory resets, etc.)
export async function clearAllFirebaseCache(): Promise<void> {
  try {
    console.log('🚨 ULTRA-AGGRESSIVE cache clearing (emergency mode)...')
    
    // Step 1: Disable network
    await disableNetwork(db)
    
    // Step 2: Clear IndexedDB persistence cache
    await clearIndexedDbPersistence(db)
    
    // Step 3: Clear browser storage
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('firebase') || key.includes('firestore')) {
          localStorage.removeItem(key)
        }
      })
      
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('firebase') || key.includes('firestore')) {
          sessionStorage.removeItem(key)
        }
      })
    }
    
    // Step 4: Re-enable network
    await enableNetwork(db)
    
    // Step 5: Wait for fresh connection
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('✅ Ultra-aggressive cache clearing completed')
  } catch (error) {
    console.error('❌ Error during ultra-aggressive cache clearing:', error)
  }
}

// Get initial data from a Firestore collection with optional cache clearing
export async function getInitial<T>(collectionName: string, forceFresh = false): Promise<T[]> {
  try {
    // Gentle cache clearing for routine refreshes, aggressive only when needed
    if (forceFresh) {
      console.log(`🔄 Gentle cache refresh for ${collectionName}...`)
      
      try {
        // Only use network disable/enable for gentle refresh (no IndexedDB clearing)
        await disableNetwork(db)
        await enableNetwork(db)
        
        // Short delay for gentle refresh (reduced from 1000ms to 200ms)
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (cacheError: any) {
        console.log(`⚠️ Gentle cache refresh completed for ${collectionName}:`, cacheError?.message || 'Unknown error')
      }
    }
    
    const collectionRef = collection(db, collectionName)
    const querySnapshot = await getDocs(collectionRef)
    
    const data: T[] = []
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() } as T)
    })
    
    console.log(`📊 Fetched ${data.length} items from ${collectionName}${forceFresh ? ' (refreshed)' : ''}`)
    
    return data
  } catch (error) {
    console.error(`❌ Error fetching ${collectionName}:`, error)
    return []
  }
}

// Subscribe to real-time updates from a Firestore collection
export function subscribe<T>(collectionName: string, cb: (docs: T[]) => void) {
  try {
    const collectionRef = collection(db, collectionName)
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(collectionRef, (querySnapshot) => {
      const data: T[] = []
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as T)
      })
      cb(data)
    }, (error) => {
      console.error(`Error subscribing to ${collectionName}:`, error)
      cb([]) // Return empty array on error
    })
    
    return unsubscribe
  } catch (error) {
    console.error(`Error setting up subscription for ${collectionName}:`, error)
    return () => {} // Return empty unsubscribe function
  }
}

// Get a single document from Firestore
export async function getOne<T>(collectionName: string, id: string): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, id)
    const docSnap = await getDocs(query(collection(db, collectionName)))
    
    // Find the document with matching id
    let foundDoc: T | null = null
    docSnap.forEach((document) => {
      const data = document.data()
      if (data.id === id || document.id === id) {
        foundDoc = { id: document.id, ...data } as T
      }
    })
    
    return foundDoc
  } catch (error) {
    console.error(`Error fetching document ${id} from ${collectionName}:`, error)
    return null
  }
}

// Subscribe to a single document's updates
export function subscribeOne<T>(collectionName: string, id: string, cb: (doc: T | null) => void) {
  try {
    const collectionRef = collection(db, collectionName)
    
    const unsubscribe = onSnapshot(collectionRef, (querySnapshot) => {
      let foundDoc: T | null = null
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.id === id || doc.id === id) {
          foundDoc = { id: doc.id, ...data } as T
        }
      })
      cb(foundDoc)
    }, (error) => {
      console.error(`Error subscribing to document ${id} in ${collectionName}:`, error)
      cb(null)
    })
    
    return unsubscribe
  } catch (error) {
    console.error(`Error setting up subscription for document ${id} in ${collectionName}:`, error)
    return () => {}
  }
}
