// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyBSteBiC3fkkZfbXqOkNkbqrPMl_AWvJbU",
  authDomain: "hack-chem-v1.firebaseapp.com",
  projectId: "hack-chem-v1",
  storageBucket: "hack-chem-v1.firebasestorage.app",
  messagingSenderId: "387273003535",
  appId: "1:387273003535:web:75bf103ed9612d6c18097a"
};

/* INIT */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* USER */
let userId = localStorage.getItem("uid")

if(userId){
  localStorage.setItem("username", userId);
}

/* EXPORT */
export { app, db, userId, doc, setDoc, getDoc };
