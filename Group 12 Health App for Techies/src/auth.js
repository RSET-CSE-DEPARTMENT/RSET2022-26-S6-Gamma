import { auth } from "./firebase";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  sendEmailVerification
} from "firebase/auth";

export const doCreateUserWithEmailAndPassword = async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
}

export const doSignInWithEmailAndPassword = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
}

export const doGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
}

export const doSignOut = async () => {
    return signOut(auth);
}

export const doPasswordReset = async (email) => {
    return sendPasswordResetEmail(auth, email);
}

export const doPasswordUpdate = async (password) => {
    return updatePassword(auth.currentUser, password);
}   

export const doSendEmailVerification = async () => {
    return sendEmailVerification(auth.currentUser);
}