import { firebaseConfig } from "@/lib/firebase-config";
import type { AuthSession } from "@/lib/firebase-auth-rest";

declare global {
  interface Window {
    firebase?: any;
  }
}

let firebaseSdkPromise: Promise<any> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
      if ((existing as HTMLScriptElement).dataset.loaded === "true") {
        resolve();
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.loaded = "false";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

async function getFirebaseSdk() {
  if (typeof window === "undefined") {
    throw new Error("Firebase popup auth is only available in the browser.");
  }

  if (!firebaseSdkPromise) {
    firebaseSdkPromise = (async () => {
      await loadScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js");

      if (!window.firebase) {
        throw new Error("Firebase SDK failed to initialize.");
      }

      if (!window.firebase.apps.length) {
        window.firebase.initializeApp(firebaseConfig);
      }

      return window.firebase;
    })();
  }

  return firebaseSdkPromise;
}

export async function signInWithGooglePopup(): Promise<AuthSession> {
  const firebase = await getFirebaseSdk();
  const auth = firebase.auth();
  const provider = new firebase.auth.GoogleAuthProvider();
  const result = await auth.signInWithPopup(provider);
  const user = result.user;

  if (!user) {
    throw new Error("Google sign-in did not return a user.");
  }

  const idToken = await user.getIdToken();
  if (!idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  return {
    idToken,
    refreshToken: user.refreshToken || "",
    expiresIn: 3600,
    user: {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || undefined,
    },
  };
}
