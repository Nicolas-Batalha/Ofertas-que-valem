export const firebaseConfig = Object.freeze({
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
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
