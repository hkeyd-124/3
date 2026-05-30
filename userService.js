// userService.js

import { db } from "./firebase.js";
import { doc, getDoc, setDoc } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔥 tạo UID chuẩn
function generateUID(){
  return "uid_" + crypto.randomUUID();
}

// ============================
// 🔍 TÌM USER THEO WALLET
// ============================
export async function getUserByWallet(wallet){

  const ref = doc(db, "wallet_index", wallet);
  const snap = await getDoc(ref);

  if(!snap.exists()) return null;

  return snap.data().uid;
}

// ============================
// 🔍 TÌM USER THEO EMAIL
// ============================
export async function getUserByEmail(email){
email = email.toLowerCase();
  const ref = doc(db, "email_index", email);
  const snap = await getDoc(ref);

  if(!snap.exists()) return null;

  return snap.data().uid;
}

// ============================
// 🆕 TẠO USER MỚI
// ============================
export async function createUser({wallet=null, email=null}){
if(email) email = email.toLowerCase();
  const uid = generateUID();

  // 🔥 TẠO USER
  await setDoc(doc(db, "users", uid), {
    uid,
    wallet,
    email,

    name: "",
    avatar: "",
    cover: "",

    points: 0,
    streak: 1,
    lastCheckin: "",

    createdAt: new Date().toISOString(),

    providers: {
      wallet: !!wallet,
      email: !!email
    },
    system: {
    status: "active", // active | banned
    role: "user"
  }
  });

  // 🔥 TẠO INDEX WALLET
  if(wallet){
    await setDoc(doc(db, "wallet_index", wallet), {
      uid: uid
    });
  }

  // 🔥 TẠO INDEX EMAIL
  if(email){
    await setDoc(doc(db, "email_index", email), {
      uid: uid
    });
  }

  return uid;
}
