/* =========================================================================
   SIWE (Sign-In With Ethereum) - PHASE 2 CLIENT
   =========================================================================
   Muc dich: user dang nhap bang vi (index.html chi ghi localStorage
   "wallet"/"uid", KHONG tao phien Firebase Auth) hien bi chan boi
   window.hcHasFirebaseSession() trong js/profile.js. File nay lay mot
   phien Firebase Auth that bang chu ky vi, de user vi doi duoc avatar.

   KHONG tao uid moi, KHONG ghi users/wallet_index/email_index. Server
   (api/siwe/verify.js) chi doc wallet_index va tra custom token mang
   DUNG uid_<uuid> dang co.

   Quy uoc giu nguyen tu repo:
     - Comment tieng Viet khong dau (giong js/profile.js, js/authLink.js)
     - Log CHI message loi, khong log token/chu ky/private key
     - Dung window.ethereum truc tiep, giong js/authLink.js:16,46,96
   ========================================================================= */

/* Feature flag. Mac dinh BAT (Phase 5): user vi can phien Firebase Auth
   de doi avatar. Tat khan cap: doi dong duoi thanh false kem deploy,
   hoac window.HC_SIWE_ENABLED = false trong console (chi phien nay). */
window.HC_SIWE_ENABLED = true;

/* Sepolia - khop index.html:721 (chainId 11155111n). */
const HC_SIWE_CHAIN_ID = 11155111;

/* Cung thoi han voi nonce ben server (api/siwe/nonce.js NONCE_TTL_MS). */
const HC_SIWE_TTL_MS = 5 * 60 * 1000;

const HC_SIWE_STATEMENT =
  "Dang nhap HackChem bang vi de doi anh dai dien.";

/* =========================
   EIP-4361 MESSAGE BUILDER

   Dung chuoi nay thay vi import thu vien siwe o client: server da parse
   va verify bang siwe that (api/siwe/verify.js), nen client chi can tao
   dung dinh dang. Nho vay khong them phu thuoc CDN nao vao trang.

   `address` PHAI la dia chi EIP-55 checksum (siwe 3.x nem loi voi dia chi
   chu thuong). KHONG dung accounts[0] tu eth_requestAccounts: MetaMask tra
   ve CHU THUONG, nen message se bi /api/siwe/verify tu choi bang 400
   UNABLE_TO_PARSE. Dung `address` do /api/siwe/nonce tra kem (da chuan hoa
   bang getAddress() o server).
========================= */
function hcBuildSiweMessage({ domain, address, uri, nonce, issuedAt, expirationTime }) {

  return (
    `${domain} wants you to sign in with your Ethereum account:\n` +
    `${address}\n` +
    `\n` +
    `${HC_SIWE_STATEMENT}\n` +
    `\n` +
    `URI: ${uri}\n` +
    `Version: 1\n` +
    `Chain ID: ${HC_SIWE_CHAIN_ID}\n` +
    `Nonce: ${nonce}\n` +
    `Issued At: ${issuedAt}\n` +
    `Expiration Time: ${expirationTime}`
  );
}

/* =========================
   ERROR -> TOAST

   Moi ma loi backend co thong bao rieng de user biet phai lam gi. Ma la
   (khong nam trong bang) dung thong bao chung.
========================= */
function hcSiweToastForError(code) {

  const messages = {

    DOMAIN_NOT_ALLOWED:
      "Khong the dang nhap bang vi tren ten mien nay.",

    UNABLE_TO_PARSE:
      "Chu ky khong hop le. Hay thu lai.",

    NONCE_UNKNOWN:
      "Phien dang nhap da het han. Hay thu lai.",

    NONCE_ADDRESS_MISMATCH:
      "Vi khong khop voi phien dang nhap. Hay thu lai.",

    WALLET_NOT_REGISTERED:
      "Vi nay chua duoc dang ky tren HackChem. Hay dang nhap bang vi truoc."
  };

  const text =
    messages[code] ||
    "Khong dang nhap duoc bang vi. Hay thu lai hoac dung email.";

  if (typeof window.showToast === "function") {
    window.showToast(text, "error");
  }
}

/* =========================
   SIGN IN

   Tra true khi da co phien Firebase Auth. Tra false cho MOI truong hop
   khac (flag tat, khong co vi, user tu choi ky, API loi, mang loi) de
   caller chi can mot nhanh xu ly va luon roi ve toast cu.
========================= */
window.hcSiweSignIn = async function () {

  /* Flag tat => khong doi hanh vi hien tai. */
  if (window.HC_SIWE_ENABLED !== true) return false;

  try {

    /* ---- 1. Phai co vi dang ket noi. ------------------------------ */

    const wallet = localStorage.getItem("wallet");

    if (!wallet) return false;

    if (!window.ethereum) return false;

    /* ---- 2. Xac nhan vi dang mo dung tai khoan. ------------------- */

    /* Chi dung accounts[0] de DOI CHIEU voi localStorage.wallet. Khong dung
       no lam dia chi trong message: MetaMask tra ve chu thuong, ma siwe 3.x
       tu choi dia chi chu thuong bang "invalid EIP-55 address". Dia chi
       dung de ky lay tu /api/siwe/nonce (buoc 3b). */
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    const address = accounts && accounts[0];

    if (!address) return false;

    /* Vi da doi tai khoan trong MetaMask => khong dang nhap de tranh
       gan chu ky cua vi khac vao phien cua uid hien tai. */
    if (address.toLowerCase() !== wallet.toLowerCase()) return false;

    /* ---- 3. Lay nonce. ------------------------------------------- */

    const nonceRes = await fetch("/api/siwe/nonce", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ address: wallet })
    });

    if (!nonceRes.ok) return false;

    const nonceData = await nonceRes.json();

    const nonce = nonceData && nonceData.nonce;

    if (!nonce) return false;

    /* ---- 3b. Lay dia chi EIP-55 do SERVER chuan hoa. -------------- */

    /* Day la gia tri PHAI dung trong message. Server da goi getAddress()
       tren dia chi lowercase, nen no luon hop le voi siwe 3.x. Van doi
       chieu lai voi wallet de chac chan nonce thuoc dung tai khoan dang
       mo. */
    const signAddress = nonceData.address;

    if (!signAddress) return false;

    if (signAddress.toLowerCase() !== wallet.toLowerCase()) return false;

    /* ---- 4. Dung message EIP-4361. ------------------------------- */

    const now = Date.now();

    const message = hcBuildSiweMessage({

      /* domain la HOST, khong kem scheme. */
      domain: window.location.host,

      address: signAddress,

      uri: window.location.origin,

      nonce,

      issuedAt: new Date(now).toISOString(),

      expirationTime: new Date(now + HC_SIWE_TTL_MS).toISOString()
    });

    /* ---- 5. Ky. Thu tu [message, address] - giong authLink.js:100. - */

    /* params[1] phai la CUNG dia chi da ghi trong message (signAddress),
       khong phai accounts[0]: mot so vi doi chieu hai gia tri nay. */
    const signature = await window.ethereum.request({

      method: "personal_sign",

      params: [message, signAddress]
    });

    if (!signature) return false;

    /* ---- 6. Doi chu ky lay custom token. ------------------------- */

    const verifyRes = await fetch("/api/siwe/verify", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ message, signature })
    });

    if (!verifyRes.ok) {

      /* Doc ma loi de bao dung nguyen nhan. Body loi khong phai secret. */
      let code = "";

      try {

        const errBody = await verifyRes.json();

        code = (errBody && errBody.error) || "";

      } catch (parseErr) {

        code = "";
      }

      hcSiweToastForError(code);

      return false;
    }

    const verifyData = await verifyRes.json();

    const token = verifyData && verifyData.token;

    if (!token) return false;

    /* ---- 7. Doi chieu uid truoc khi dang nhap. ------------------- */

    /* Neu API tra uid khac localStorage.uid thi co gi do sai (vi da doi
       chu tai khoan). Khong dang nhap de tranh ghi nham tai lieu. */
    const localUid = localStorage.getItem("uid");

    if (verifyData.uid && localUid && verifyData.uid !== localUid) {

      console.error("SIWE uid mismatch - khong dang nhap");

      return false;
    }

    /* ---- 8. Tao phien Firebase Auth. ----------------------------- */

    /* `../firebase.js`, KHONG phai `./firebase.js`: file nay nam trong
       js/, con firebase.js nam o goc repo. */
    const firebase = await import("../firebase.js");

    const authMod = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
    );

    /* getAuth(app) voi dung `app` cua firebase.js - cung instance voi
       authEmail.js va js/profile.js:1307. */
    const auth = authMod.getAuth(firebase.app);

    await authMod.signInWithCustomToken(auth, token);

    await auth.authStateReady();

    return !!auth.currentUser;

  } catch (err) {

    /* User tu choi ky trong vi cung roi vao day - khong phai loi, nen
       chi log message va tra false de caller hien toast cu. */
    console.error("SIWE sign-in failed:", err && err.message);

    return false;
  }
};
