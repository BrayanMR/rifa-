import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCvjFupQnKYiL7Qhktkq6eDk3Q9o69Qg50",
  authDomain: "raspas-cd14d.firebaseapp.com",
  projectId: "raspas-cd14d",
  storageBucket: "raspas-cd14d.firebasestorage.app",
  messagingSenderId: "132325052456",
  appId: "1:132325052456:web:a6a1dc97e98273ca9f251d",
  measurementId: "G-EQ0YS59DJS"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
