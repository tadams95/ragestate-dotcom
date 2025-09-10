import axios from "axios";

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebase";

import { setLocalId } from "../../lib/features/todos/userSlice";

const API_KEY =
  process.env.NEXT_PUBLIC_apiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export async function createUser(
  email,
  password,
  firstName,
  lastName,
  phoneNumber,
  expoPushToken,
  dispatch
) {
  try {
    const response = await axios.post(
      "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" +
        API_KEY,
      {
        email: email,
        password: password,
        returnSecureToken: true,
      }
    );

    // Save additional user data to real-time database
    const userId = response.data.localId; // Assuming Firebase returns the user ID
    await axios.put(
      `https://ragestate-app-default-rtdb.firebaseio.com/users/${userId}.json`,
      {
        email: email,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber,
        expoPushToken: expoPushToken,
        qrCode: userId,
      }
    );

    // Dispatch an action to update the userId in the Redux store
    dispatch(setLocalId(userId));

    return response.data; // You might want to return the response data for further processing
  } catch (error) {
    console.error(
      "Error creating user:",
      error.response ? error.response.data : error.message
    );

    if (error.response && error.response.data && error.response.data.error) {
      const errorCode = error.response.data.error.message;
      if (errorCode === "EMAIL_EXISTS") {
        throw new Error(
          "Email exists, please try logging in or forgot password."
        );
      }
    }

    throw new Error("Error creating user"); // You might want to throw an error for the calling code to handle
  }
}

export async function loginUser(email, password) {
  try {
    // Sign in the user with email and password using Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Extract user data or token from the userCredential if needed
    const user = userCredential.user;
    // Return user data or perform additional actions

    return user;
  } catch (error) {
    // Handle errors
    console.error("Error logging user in:", error.message);
    throw error;
  }
}

export async function forgotPassword(email) {
  try {
    // Use Firebase Auth SDK to avoid manual API key handling
    await sendPasswordResetEmail(auth, email);
    console.log("Password reset email sent successfully for:", email);
    return true;
  } catch (error) {
    // FirebaseError has 'code' and 'message'
    const code = error?.code || "unknown";
    const message = error?.message || String(error);
    console.error("Password reset failed:", code, message);
    return false;
  }
}
