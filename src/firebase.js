import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDXxKDwx0dhZXcHAwXKioJQLgxtCHIDYjA",
  authDomain: "rentarc-900ca.firebaseapp.com",
  projectId: "rentarc-900ca",
  storageBucket: "rentarc-900ca.firebasestorage.app",
  messagingSenderId: "61489693734",
  appId: "1:61489693734:web:56cd5fab10a7a2b8ad52e7",
  measurementId: "G-HS190VZG0W"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
