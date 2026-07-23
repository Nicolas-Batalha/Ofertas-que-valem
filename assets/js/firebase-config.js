export const firebaseConfig = Object.freeze({
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  adminUid: ""
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
