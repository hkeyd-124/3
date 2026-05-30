import {
  doc,
  setDoc,
  getDoc
}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const db = window.db;
/* =========================
   LINK WALLET
========================= */
window.linkWallet = async function(){

  if(!window.ethereum){
hideLoading();
    showToast("Cần MetaMask!");

    return;
  }

  try{
showLoading(
  "Linking wallet..."
);
    /* =========================
       CURRENT UID
    ========================= */

    const uid =
      getUID();

    if(!uid){
hideLoading();
      showToast("Bạn chưa login!");

      return;
    }

    /* =========================
       CONNECT WALLET
    ========================= */

    const accounts =
      await ethereum.request({

        method:"eth_requestAccounts"

      });

    const wallet =
      accounts[0]
      .toLowerCase();

    /* =========================
       CHECK WALLET EXIST
    ========================= */

    const walletRef =
      doc(
        db,
        "wallet_index",
        wallet
      );

    const walletSnap =
      await getDoc(walletRef);

    /* =========================
       WALLET ĐÃ THUỘC UID KHÁC
    ========================= */

    if(walletSnap.exists()){

      const data =
        walletSnap.data();

      if(data.uid !== uid){
hideLoading();
        showToast(
          "Ví này đã liên kết với tài khoản khác!"
        );

        return;
      }
    }

    /* =========================
       SIGN MESSAGE
    ========================= */

    const message =
      "Link wallet to HackChem";

    await ethereum.request({

      method:"personal_sign",

      params:[
        message,
        wallet
      ]

    });

    /* =========================
       UPDATE USER
    ========================= */

    await setDoc(

      doc(
        db,
        "users",
        uid
      ),

      {

        wallet,

        "providers.wallet":true

      },

      {

        merge:true

      }

    );

    /* =========================
       SAVE WALLET INDEX
    ========================= */

    await setDoc(

      walletRef,

      {

        uid

      }

    );

    /* =========================
       SAVE LOCAL
    ========================= */

    localStorage.setItem(
      "wallet",
      wallet
    );
updateLinkButtons();
    hideLoading();
    showToast(
  "✅ Link wallet thành công!"
);

  }catch(err){
hideLoading();
    console.error(err);
hideLoading();
    showToast(
  "❌ Link wallet thất bại",
  "error"
);
  }
}

/* =========================
   SHOW EMAIL MODAL
========================= */

window.showLinkEmailModal =
function(){

  document.getElementById(
    "linkEmailModal"
  ).style.display = "flex";
}

/* =========================
   LINK EMAIL
========================= */

window.linkEmail =
async function(){
  const uid =
    getUID();
  try{
showLoading(
  "Linking email..."
);
    const email =
      document.getElementById(
        "linkEmailInput"
      )

      .value
      .trim()
      .toLowerCase();

    const password =
      document.getElementById(
        "linkPasswordInput"
      ).value;
const confirmPassword =

  document.getElementById(
    "linkConfirmPasswordInput"
  ).value;
   if(
  !email ||
  !password ||
  !confirmPassword
){
hideLoading();
  showToast(
  "Nhập đầy đủ thông tin!"
);

  return;
}

/* PASSWORD MATCH */

if(password !== confirmPassword){
hideLoading();
  showToast(
  "Mật khẩu xác nhận không khớp!"
);

  return;
}

/* PASSWORD LENGTH */

if(password.length < 6){
hideLoading();
  showToast(
  "Mật khẩu tối thiểu 6 kí tự!"
);

  return;
}

    /* =========================
       CHECK EMAIL INDEX
    ========================= */

    const emailRef =
      doc(
        db,
        "email_index",
        email
      );

    const emailSnap =
      await getDoc(emailRef);

    if(emailSnap.exists()){

      const data =
        emailSnap.data();

      if(data.uid !== uid){
hideLoading();
        showToast(
  "Email đã liên kết với tài khoản khác!"
);

        return;
      }
    }

    /* =========================
       UPDATE USER
    ========================= */

    await setDoc(

      doc(
        db,
        "users",
        uid
      ),

      {

        email,

        "providers.email":true

      },

      {

        merge:true

      }

    );

    /* =========================
       SAVE EMAIL INDEX
    ========================= */

    await setDoc(

      emailRef,

      {

        uid

      }

    );

    localStorage.setItem(
      "email",
      email
    );

    document.getElementById(
      "linkEmailModal"
    ).style.display = "none";
updateLinkButtons();
    hideLoading();
    showToast(
  "✅ Link email thành công!"
);

  }catch(err){
hideLoading();
    console.error(err);
hideLoading();
    showToast(
      "❌ Link email thất bại"
    );
  }
}

/* =========================
   UPDATE LINK BUTTONS
========================= */

window.updateLinkButtons =
async function(){

  try{

    const uid =
      getUID();

    if(!uid) return;

    const userRef =
      doc(db,"users",uid);

    const snap =
      await getDoc(userRef);

    if(!snap.exists()) return;

    const data =
      snap.data();

    /* WALLET */

    if(data.wallet){

      const btn =
        document.getElementById(
          "linkWalletBtn"
        );

      if(btn){

        btn.style.display =
          "none";
      }
    }

    /* EMAIL */

    if(data.email){

      const btn =
        document.getElementById(
          "linkEmailBtn"
        );

      if(btn){

        btn.style.display =
          "none";
      }
    }

  }catch(err){

    console.error(err);
  }
}

/* =========================
   TOGGLE PASSWORD
========================= */

window.toggleLinkPassword =
function(){

  const input =
    document.getElementById(
      "linkPasswordInput"
    );

  input.type =

    input.type === "password"
      ? "text"
      : "password";
}

/* =========================
   TOGGLE CONFIRM PASSWORD
========================= */

window.toggleLinkConfirmPassword =
function(){

  const input =
    document.getElementById(
      "linkConfirmPasswordInput"
    );

  input.type =

    input.type === "password"
      ? "text"
      : "password";
}
