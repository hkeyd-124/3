// authEmail.js
import { getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { doc, setDoc } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "./firebase.js";
import { getUserByEmail, createUser } from "./userService.js";
import { app } from "./firebase.js";

const auth = getAuth(app);

// ============================
// 🔥 LOGIN / REGISTER EMAIL
// ============================
export async function loginWithEmail(email, password){
email = email.trim().toLowerCase();
  let userCredential;

  // ============================
  // 🔥 STEP 1: LOGIN FIREBASE AUTH
  // ============================
  try{
    userCredential = await signInWithEmailAndPassword(auth, email, password);
   await userCredential.user.reload();

if(!userCredential.user.emailVerified){

  // 🔥 LƯU email tạm để resend
  localStorage.setItem("pending_verify_email", email);

  alert("⚠️ Email chưa xác thực! Kiểm tra hộp thư hoặc gửi lại.");

  return "NOT_VERIFIED"; // 🔥 signal đặc biệt
}
  }catch(err){

    // 👉 nếu chưa có tài khoản → tạo mới
    if(
      err.code === "auth/user-not-found" ||
      err.code === "auth/invalid-credential"
    ){
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);

// 🔥 lưu email để resend
localStorage.setItem("pending_verify_email", email);

alert("📩 Email xác nhận đã được gửi, hãy kiểm tra!!");

return "NOT_VERIFIED";
    }
    else if(err.code === "auth/wrong-password"){
      alert("Sai mật khẩu!");
      return null;
    }
    else{
      throw err;
    }
  }

  // ============================
  // 🔥 STEP 2: XÁC ĐỊNH UID ĐÚNG
  // ============================

  // ❗ KHÔNG dùng localStorage uid ở đây nữa
  let uid = await getUserByEmail(email);

  // 👉 nếu email chưa tồn tại trong hệ của bạn → tạo user mới
  if(!uid){
    uid = await createUser({ email });
  }

  // ============================
  // 🔥 STEP 3: ĐẢM BẢO INDEX
  // ============================
  await setDoc(doc(db, "email_index", email), {
    uid: uid
  });

// 🔥 CHECK BAN
const snap = await getDoc(doc(db, "users", uid));

if(snap.exists()){
  const data = snap.data();

  if(data.system?.status === "banned"){
    alert("🚫 Tài khoản đã bị khóa!");
    return null;
  }
}
  // ============================
  // 🔥 STEP 4: LƯU LOCAL
  // ============================
  localStorage.setItem("uid", uid);

  // ❗ KHÔNG set wallet ở đây
  // ❗ KHÔNG link tự động

  return uid;
}
