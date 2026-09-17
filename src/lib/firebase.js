import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { publicEnv } from "@/lib/env";

function getFirebaseApp() {
  if (getApps().length) return getApp();
  return initializeApp(publicEnv.firebase);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getGoogleProvider() {
  return new GoogleAuthProvider();
}
