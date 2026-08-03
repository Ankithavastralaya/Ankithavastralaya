// Firebase project: ankithavastralaya-c7356. This config is meant to be
// public (it's embedded in every visitor's browser) — access control lives
// entirely in firestore.rules, not in keeping this secret.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyB56wVBQW_-bC-nBt7NAMbUiFz0spg3sqE",
  authDomain: "ankithavastralaya-c7356.firebaseapp.com",
  projectId: "ankithavastralaya-c7356",
  storageBucket: "ankithavastralaya-c7356.firebasestorage.app",
  messagingSenderId: "826379301746",
  appId: "1:826379301746:web:2b139dc477b4e0b51fe3eb"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
