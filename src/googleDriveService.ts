/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Google Drive Integration Service for Aetra Minor Repair Reports
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App safely (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Configure Google Auth Provider with Google Drive File scope
const provider = new GoogleAuthProvider();
export const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.setCustomParameters({
  prompt: "select_account",
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

// Initialize auth state listener
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedUser = user;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token might have expired or requires popup refresh
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedUser = null;
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google to get an OAuth Access Token for Google Drive
 */
export const signInWithGoogle = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Gagal memperoleh token otorisasi Google Drive.");
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Google Drive Sign-in Error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getCachedGoogleUser = (): User | null => {
  return cachedUser;
};

export const signOutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  cachedUser = null;
};

/**
 * Find or create a dedicated folder in user's Google Drive: "Laporan Minor Repair Aetra"
 */
async function getOrCreateAetraFolder(accessToken: string): Promise<string | null> {
  const folderName = "Laporan Minor Repair - Aetra Air Tangerang";
  try {
    // Search if folder already exists
    const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }

    // Create new folder if not found
    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      }),
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      return createData.id;
    }
  } catch (e) {
    console.warn("Folder creation error, falling back to root drive:", e);
  }
  return null;
}

export interface UploadDriveResult {
  fileId: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
}

/**
 * Upload a PDF Blob to Google Drive using multipart upload
 */
export async function uploadPdfToDrive(
  pdfBlob: Blob,
  filename: string,
  accessToken?: string
): Promise<UploadDriveResult> {
  const token = accessToken || cachedAccessToken;
  if (!token) {
    throw new Error(
      "Otorisasi Google Drive belum aktif. Silakan hubungkan akun Google Anda terlebih dahulu."
    );
  }

  // Get or create parent folder
  const parentFolderId = await getOrCreateAetraFolder(token);

  const metadata: any = {
    name: filename,
    mimeType: "application/pdf",
    description: "Dokumen Berita Acara Penyelesaian Pekerjaan Minor Repair Aetra Air Tangerang",
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const boundary = "-------AetraDriveUploadBoundary" + Math.random().toString(36).substring(2);
  const delimiter = "\r\n--" + boundary + "\r\n";
  const closeDelimiter = "\r\n--" + boundary + "--";

  const pdfArrayBuffer = await pdfBlob.arrayBuffer();
  const pdfBytes = new Uint8Array(pdfArrayBuffer);

  const metadataHeader =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/pdf\r\n" +
    "Content-Transfer-Encoding: binary\r\n\r\n";

  const encoder = new TextEncoder();
  const headBytes = encoder.encode(metadataHeader);
  const tailBytes = encoder.encode(closeDelimiter);

  // Combine into a single body Uint8Array
  const totalLength = headBytes.length + pdfBytes.length + tailBytes.length;
  const multipartBody = new Uint8Array(totalLength);
  multipartBody.set(headBytes, 0);
  multipartBody.set(pdfBytes, headBytes.length);
  multipartBody.set(tailBytes, headBytes.length + pdfBytes.length);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    let parsedMessage = errorText;
    try {
      const errJson = JSON.parse(errorText);
      parsedMessage = errJson.error?.message || errorText;
    } catch (_) {}
    throw new Error(`Gagal upload ke Google Drive: ${parsedMessage}`);
  }

  const result: UploadDriveResult = await uploadRes.json();
  return result;
}
