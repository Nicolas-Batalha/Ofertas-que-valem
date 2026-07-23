export const firebaseConfig = Object.freeze({
  apiKey: "AIzaSyA1h3JPTR6QsX_8yLVICxODbNs6tGTwR2g",
  authDomain: "ofertas-que-valem.firebaseapp.com",
  projectId: "ofertas-que-valem",
  storageBucket: "ofertas-que-valem.firebasestorage.app",
  messagingSenderId: "1067773544050",
  appId: "1:1067773544050:web:b4d46aa9891e6b93a824eb",
  measurementId: "G-29DW09E1MP",
  adminUid: "kpU6X9tsXATbyuUw7fje269z4EL2"
});

export function firebaseConfigurado() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    firebaseConfig.adminUid
  );
}
