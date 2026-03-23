import{
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged
} from "firebase/auth";
import {auth} from "./firebase";
import {saveUserToFirestore} from "./userServices";

const googleProvider = new GoogleAuthProvider();

export const initAuthPersistance =  async()=>{
    await setPersistence(auth, browserLocalPersistence);
};

export const signInwithGoogle = async() =>{
    const result =await signInWithPopup(auth,googleProvider);
    await saveUserToFirestore(result.user,"google");
    return result.user;
};

export const signUpWithEmail = async(email, password) =>{
    const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
    );
    await saveUserToFirestore(result.user,"password");
    return result.user;
};