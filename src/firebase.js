import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyC13IYCYsIJohGhmEj-kCQixQsA49Dr4d8',
  authDomain: 'clube-do-livro-16073.firebaseapp.com',
  projectId: 'clube-do-livro-16073',
  storageBucket: 'clube-do-livro-16073.firebasestorage.app',
  messagingSenderId: '291212027495',
  appId: '1:291212027495:web:cc78b2238c0c15fc5ed6c2',
  measurementId: 'G-248J4EDFPJ',
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
