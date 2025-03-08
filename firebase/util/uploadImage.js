import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

/**
 * Uploads an image file to Firebase Storage and updates the user's profile
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
      
      // Create a storage reference
      const timestamp = new Date().getTime();
      const storageRef = ref(storage, `profilePictures/${userId}/${timestamp}_${file.name}`);
      
      // Upload the file
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      // Listen for state changes, errors, and completion
      uploadTask.on('state_changed',
        // Progress handler
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
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
            console.log('File available at', downloadURL);
            
            // Update user's document in Firestore
            const userRef = doc(firestore, "customers", userId);
            await updateDoc(userRef, {
              profilePicture: downloadURL
            });
            
            // Update local storage
            localStorage.setItem("profilePicture", downloadURL);
            
            resolve(downloadURL);
          } catch (error) {
            console.error("Error getting download URL:", error);
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
