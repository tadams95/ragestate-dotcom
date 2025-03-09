import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { getDatabase, ref as dbRef, update } from "firebase/database";

/**
 * Uploads an image file to Firebase Storage and updates the user's profile
 * in both Firestore and Realtime Database
 * 
 * @param {File} file - The image file to upload
 * @param {string} userId - The user's Firebase ID
 * @param {Function} onProgress - Optional callback for upload progress (0-100)
 * @param {Function} onError - Optional callback for error handling
 * @returns {Promise<string>} - The download URL of the uploaded image
 */
export default async function uploadImage(file, userId, onProgress, onError) {
  return new Promise((resolve, reject) => {
    if (!file || !userId) {
      const error = new Error("File and userId are required");
      if (onError) onError(error);
      reject(error);
      return;
    }

    try {
      // Validate file is an image
      if (!file.type.match('image.*')) {
        const error = new Error("Only image files are allowed");
        if (onError) onError(error);
        reject(error);
        return;
      }

      // Limit file size (5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        const error = new Error("Image size should be less than 5MB");
        if (onError) onError(error);
        reject(error);
        return;
      }

      const storage = getStorage();
      const firestore = getFirestore();
      const database = getDatabase();
      
      // Create a storage reference with timestamp to avoid cache issues
      const timestamp = new Date().getTime();
      const fileExtension = file.name.split('.').pop();
      const fileName = `profile_${timestamp}.${fileExtension}`;
      const storageRef = ref(storage, `profilePictures/${userId}/${fileName}`);
      
      console.log("Starting upload to:", storageRef.fullPath);
      
      // Upload the file
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      // Listen for state changes, errors, and completion
      uploadTask.on('state_changed',
        // Progress handler
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          console.log(`Upload progress: ${progress}%`);
          if (onProgress) onProgress(progress);
        },
        // Error handler
        (error) => {
          console.error("Upload failed:", error);
          if (onError) onError(error);
          reject(error);
        },
        // Success handler
        async () => {
          try {
            // Get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('File uploaded successfully. Available at:', downloadURL);
            
            // Batch updates to both databases
            const updates = [];
            
            // 1. Update Firestore - Also update firstName, lastName if available
            try {
              const userRef = doc(firestore, "customers", userId);
              const updateData = {
                profilePicture: downloadURL,
                lastUpdated: new Date().toISOString()
              };
              
              // If we have first and last name in localStorage, also update those
              // This ensures Firestore has complete user data
              const firstName = localStorage.getItem("firstName");
              const lastName = localStorage.getItem("lastName");
              
              if (firstName) updateData.firstName = firstName;
              if (lastName) updateData.lastName = lastName;
              
              await updateDoc(userRef, updateData);
              console.log("Firestore updated with new profile picture");
              updates.push("Firestore");
            } catch (err) {
              console.error("Error updating Firestore:", err);
              // Continue with other updates even if this fails
            }
            
            // 2. Update Realtime Database
            try {
              const userRtDbRef = dbRef(database, `${userId}`);
              await update(userRtDbRef, {
                profilePicture: downloadURL,
                lastUpdated: new Date().toISOString()
              });
              console.log("Realtime Database updated with new profile picture");
              updates.push("Realtime Database");
            } catch (err) {
              console.error("Error updating Realtime Database:", err);
              // Continue with localStorage even if this fails
            }
            
            // 3. Update localStorage
            try {
              localStorage.setItem("profilePicture", downloadURL);
              console.log("localStorage updated with new profile picture");
              updates.push("localStorage");
            } catch (err) {
              console.error("Error updating localStorage:", err);
            }
            
            if (updates.length === 0) {
              const error = new Error("Failed to update profile picture in any database");
              if (onError) onError(error);
              reject(error);
              return;
            }
            
            console.log(`Profile picture successfully updated in: ${updates.join(", ")}`);
            resolve(downloadURL);
          } catch (error) {
            console.error("Error in final upload processing:", error);
            if (onError) onError(error);
            reject(error);
          }
        }
      );
    } catch (error) {
      console.error("Error in uploadImage:", error);
      if (onError) onError(error);
      reject(error);
    }
  });
}
