import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1VZHZ8G6lLwcx0vQg8j7sR8G2PTLxV-Q",
  authDomain: "meme-generator-e3368.firebaseapp.com",
  projectId: "meme-generator-e3368",
  storageBucket: "meme-generator-e3368.firebasestorage.app",
  messagingSenderId: "362450191107",
  appId: "1:362450191107:web:92c4d409e4cf58317b9f36",
  measurementId: "G-B7SNJ33WFP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export { serverTimestamp };
