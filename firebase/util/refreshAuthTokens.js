import { app } from "../firebase";
import { onAuthStateChanged, getAuth } from "firebase/auth";

// Get Firebase Auth instance from the initialized app
const auth = getAuth(app);

// Function to refresh ID Token using Firebase Auth SDK
const refreshAuthTokens = async () => {
  try {
    // Ensure there is an authenticated user
    const user = auth.currentUser;
    if (user) {
      // Force refresh the ID token
      await user.getIdToken(true); // This line refreshes the token

      // Optionally, you can get the refreshed token if needed
      const newIdToken = await user.getIdToken();

      // Use newIdToken for authenticated API requests or other operations
      console.log("Refreshed ID Token:", newIdToken);

      return newIdToken;
    } else {
      console.error("No user found");
      return null;
    }
  } catch (error) {
    console.error("Error refreshing token:", error.message);
    return null;
  }
};

export default refreshAuthTokens;
