import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase/config";

export const canUploadTutorial = async () => {
  const uid = auth.currentUser.uid;

  const ref = doc(db, "tutorialUploads", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return true;

  const lastUpload = snap.data().lastUpload?.toDate?.();

  if (!lastUpload) return true;

  const now = new Date();
  const diff = now - lastUpload;

  const ONE_DAY = 24 * 60 * 60 * 1000;

  return diff > ONE_DAY;
};

export const markUpload = async () => {
  const uid = auth.currentUser.uid;

  await setDoc(doc(db, "tutorialUploads", uid), {
    lastUpload: serverTimestamp(),
  });
};