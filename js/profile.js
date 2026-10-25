import {
  doc,
  onSnapshot,
  setDoc
}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const DEFAULT_COVER = `
linear-gradient(
135deg,
#eefcfb 0%,
#d7f5f1 100%
)
`;
const COVER_GRADIENTS = {
  ocean: "linear-gradient(135deg,#6dd5ed,#2193b0)",
  emerald: "linear-gradient(135deg,#11998e,#38ef7d)",
  sunset: "linear-gradient(135deg,#ff9966,#ff5e62)",
  sakura: "linear-gradient(135deg,#fbc2eb,#a6c1ee)",
  lavender: "linear-gradient(135deg,#c471f5,#fa71cd)",
  chemistry: "linear-gradient(135deg,#00c6ff,#0072ff)"
};
/* =========================
   SAME-ORIGIN IMAGE URL GUARD

   Optional companion fields `avatarUrl` / `coverImageUrl` may hold a URL
   instead of a ~200 KB base64 data URI. They accept SAME-ORIGIN URLs only.

   Why: js/certificateEngine.js draws the avatar onto #certificateCanvas and
   js/lessonEngine.js then calls canvas.toDataURL(). Drawing a CROSS-ORIGIN
   image onto a canvas without crossOrigin="anonymous" taints it, and
   toDataURL() then throws "SecurityError: Tainted canvases may not be
   exported" — which would break NFT minting. crossOrigin is never set in
   this repo, so a cross-origin avatarUrl WOULD break minting. A same-origin
   URL can never taint the canvas, so restricting to same-origin is exactly
   what makes this safe without touching js/certificate*.js.
========================= */
const hcFailedUrls = new Set();

function normalizeSameOriginUrl(raw){

  if(typeof raw !== "string") return "";

  const value = raw.trim();

  if(!value) return "";

  try{

    const parsed = new URL(value, window.location.href);

    if(
      parsed.protocol !== "http:"
      &&
      parsed.protocol !== "https:"
    ){
      return "";
    }

    if(parsed.origin !== window.location.origin) return "";

    return parsed.href;

  }catch(err){
    return "";
  }
}

function pickAvatarSrc(user){

  if(!user) return "";

  const url = normalizeSameOriginUrl(user.avatarUrl);

  if(!url || hcFailedUrls.has(url)) return "";

  return url;
}

function pickCoverImageSrc(user){

  if(!user) return "";

  const url = normalizeSameOriginUrl(user.coverImageUrl);

  if(!url || hcFailedUrls.has(url)) return "";

  return url;
}

/* Cover is painted as a CSS background, and CSS has no per-image error
   event, so probe the URL; on failure mark it and re-render once. */
function guardCoverImageSrc(url){

  if(!url || hcFailedUrls.has(url)) return;

  const probe = new Image();

  probe.onerror = function(){

    hcFailedUrls.add(url);

    if(typeof window.renderProfileCard === "function"){
      window.renderProfileCard();
    }
  };

  probe.src = url;
}

window.hcNormalizeSameOriginUrl = normalizeSameOriginUrl;

/* =========================
   FIREBASE
========================= */

const db = window.db;

/* =========================
   GLOBAL USER
========================= */

window.currentUser = null;

/* =========================
   GET UID
========================= */

window.getUID = function(){

  return (

    localStorage.getItem("uid")

    ||

    localStorage.getItem("wallet")

    ||

    "guest"

  );
}

/* =========================
   LOAD USER
========================= */

window.loadCurrentUser =
async function(){

  try{

    const uid =
      getUID();

    if(
      !uid ||
      uid === "guest"
    ){

      console.warn(
        "Guest mode"
      );

      return null;
    }

    /* =========================
       SINGLE READ PATH

       This function used to read users/{uid} itself, and then
       startUserRealtime() below opened an onSnapshot on the very same
       document. Every home.html load therefore pulled the document
       twice — 2 billed reads, and twice the payload (which is large
       once an avatar is stored inline as base64).

       The document is now read by exactly ONE path: the onSnapshot in
       startUserRealtime(). A snapshot fires immediately with the current
       data, so the UI still populates on first paint, and the ban check
       still runs — now on every change instead of only once per page
       load. The global state (window.currentUser / currentUserData and
       the _uid marker that updateLinkButtons() relies on) is filled
       inside that callback, BEFORE the promise settles, so any caller
       resuming from `await loadCurrentUser()` sees populated globals.

       Contract kept unchanged: this still resolves with the user object,
       and still resolves with null for a guest or a missing document.
    ========================= */

    const ready =
      startUserRealtime();

    /* null => guest / no uid: no listener opened, nothing to await. */

    if(!ready){

      console.warn(
        "Guest mode"
      );

      return null;
    }

    return await ready;

  }catch(err){

    console.error(
      "LOAD USER ERROR:",
      err
    );

    return null;
  }
}

/* =========================
   RENDER PROFILE
========================= */

window.renderProfileCard =
function(){

  const box =
    document.getElementById("profileCard");

/* The profile card only exists on home.html. lesson.html also loads this
   module (and lessonEngine.js calls loadCurrentUser()), so bail out
   BEFORE touching box.style — the guard used to sit further down, after
   the cover writes, so a page without #profileCard threw a TypeError
   instead of returning. */

if(
  !box ||
  !currentUser
) return;

/* =========================
   COVER IMAGE — OPTIONAL URL FIELD

   Uu tien field moi `coverImageUrl` (chi nhan URL cung origin, xem khoi
   SAME-ORIGIN IMAGE URL GUARD o tren dau file). Neu khong co / URL hong
   thi quay ve field cu `coverImage` (base64) nhu truoc.
========================= */
const coverImageSrc =
    pickCoverImageSrc(currentUser);

const coverImageFallback =
    currentUser.coverImage || "";

if(
    currentUser.coverType==="image"
    &&
    (coverImageSrc || coverImageFallback)
){

    box.style.background = `
linear-gradient(
rgba(255,255,255,.70),
rgba(255,255,255,.80)
),
url(${coverImageSrc || coverImageFallback})
`;

}
else{

    let cover = DEFAULT_COVER;

    if(
        currentUser.coverType==="gradient"
        &&
        COVER_GRADIENTS[currentUser.cover]
    ){
        cover =
        COVER_GRADIENTS[currentUser.cover];
    }

    box.style.background = `
linear-gradient(
rgba(255,255,255,.70),
rgba(255,255,255,.80)
),
${cover}
`;
}

box.style.backgroundSize="cover";
box.style.backgroundPosition="center";
box.style.backgroundRepeat="no-repeat";

  const username =

    currentUser.name

    ||

    "Unnamed";
/* Optional new field first, legacy base64 second, bundled default last. */
const avatarUrl =

  pickAvatarSrc(currentUser);

const avatar =

  avatarUrl

  ||

  currentUser.avatar

  ||

  "assets/images/default-avatar.png";
  const points =

    currentUser.points

    ||

    0;

  const email =

    currentUser.email

    ||

    "Not linked";

  const wallet =

    currentUser.wallet

    ||

    "Not linked";

  box.innerHTML = `
  
<div
id="coverEditButton"
style="
position:absolute;
top:18px;
right:18px;
width:44px;
height:44px;
border-radius:50%;
display:flex;
align-items:center;
justify-content:center;
background:rgba(255,255,255,.72);
backdrop-filter:blur(12px);
box-shadow:0 4px 14px rgba(0,0,0,.08);
cursor:pointer;
opacity:0;
transform:scale(.92);
transition:.25s;
z-index:999;
"
onclick="openCoverModal()"
>
🖼️
</div>


<div style="
display:flex;
justify-content:space-between;
align-items:flex-start;
gap:40px;
flex-wrap:wrap;
width:100%;
">

  <!-- LEFT SIDE -->

  <div style="
  display:flex;
  flex-direction:column;
  gap:18px;
  ">

    <!-- TOP PROFILE -->

    <div style="
    display:flex;
    align-items:center;
    gap:18px;
    ">

      <!-- AVATAR -->

      <div style="
      position:relative;
      ">

        <img

          id="profileAvatar"

          src="${avatar}"

          onerror="if(!this.dataset.fb){this.dataset.fb='1';var n=document.getElementById('profileAvatar');if(n){n.onerror=null;}}"

          style="
          width:74px;
          height:74px;

          border-radius:50%;
          object-fit:cover;

          border:3px solid #f1f5f9;
          "

        >

        <!-- EDIT -->

        <div

          onclick="changeAvatar()"

          style="
          position:absolute;
          right:-2px;
          bottom:-2px;

          width:28px;
          height:28px;

          border-radius:50%;
          background:white;

          display:flex;
          align-items:center;
          justify-content:center;

          cursor:pointer;

          border:1px solid #ddd;

          font-size:14px;
          "
        >

          ✏️

        </div>

      </div>

      <!-- NAME -->

      <div>

        <div style="
        font-size:18px;
        color:#666;
        margin-bottom:2px;
        ">

          Xin chào

        </div>

       <div
style="
display:flex;
align-items:center;
gap:10px;
">

    <div style="
    font-family:'Segoe UI',Tahoma,Arial,sans-serif;
    font-size:42px;
    font-weight:800;
    color:#111;
    line-height:1.2;
    letter-spacing:-0.03em;
    ">
    ${username}
</div>

    <div
        onclick="changeName()"
        title="Đổi tên"
        style="
        cursor:pointer;
        font-size:20px;
        user-select:none;
        transition:.2s;
        "
        onmouseover="this.style.transform='scale(1.15)'"
        onmouseout="this.style.transform='scale(1)'"
    >
        ✏️
    </div>

</div>

      </div>

    </div>

    <!-- POINTS ROW -->

    <div style="
    display:flex;
    align-items:center;
    gap:14px;
    flex-wrap:wrap;
    ">

      <!-- POINTS -->

      <div
        onclick="openCheckin()"

        style="
        background:#111;
        color:white;

        padding:14px 20px;

        border-radius:18px;

        font-weight:bold;

        display:flex;
        align-items:center;
        gap:10px;

        cursor:pointer;

        min-width:110px;
        justify-content:center;
        "
      >

        🧪

        <span id="pointValue">
          0
        </span>

      </div>

      <!-- STREAK -->

      <div style="
      background:#fff7ed;
      color:#ea580c;

      padding:14px 20px;

      border-radius:18px;

      font-weight:bold;

      display:flex;
      align-items:center;
      gap:10px;

      min-width:110px;
      justify-content:center;

      border:1px solid #fed7aa;
      ">

        🔥

        <span id="streak">
          0
        </span>

        ngày

      </div>

      <!-- CHECKIN -->

      <button

        id="checkinQuickBtn"

        onclick="openCheckin()"

        style="
        border:none;

        background:#facc15;
        color:#111;

        padding:14px 22px;

        border-radius:18px;

        font-weight:700;

        cursor:pointer;

        box-shadow:
          0 8px 20px rgba(250,204,21,0.3);
        ">
        ✅ Check-in

      </button>

    </div>

  </div>

  <!-- RIGHT SIDE -->

  <div style="
  display:flex;
  flex-direction:column;

  align-items:flex-end;
  justify-content:flex-start;

  gap:18px;

  margin-left:auto;

  padding-top:10px;

  min-width:320px;
  ">

    <!-- WALLET -->

    <div style="
    font-size:15px;
    color:#444;

    text-align:right;

    word-break:break-all;
    ">

      🦊

      ${
        wallet ||

        "Chưa liên kết ví"
      }

    </div>

    <!-- EMAIL -->

    <div style="
    font-size:15px;
    color:#444;

    text-align:right;

    word-break:break-all;
    ">

      📧

      ${
        email ||

        "Chưa liên kết email"
      }

    </div>

    <!-- LOGOUT -->

    <div

      onclick="logout()"

      style="
      margin-top:6px;

      cursor:pointer;

      font-weight:700;

      display:flex;
      align-items:center;
      gap:8px;

      color:#111;
      "
    >

      Đăng xuất

      ↩️

    </div>

  </div>

</div>

`;
  box.onmouseenter = ()=>{

    const btn =
    document.getElementById(
        "coverEditButton"
    );

    if(!btn) return;

    btn.style.opacity="1";
    btn.style.transform="scale(1)";
};

box.onmouseleave = ()=>{

    const btn =
    document.getElementById(
        "coverEditButton"
    );

    if(!btn) return;

    btn.style.opacity="0";
    btn.style.transform="scale(.92)";
};

/* Neu avatar URL (field moi) load loi thi quay ve avatar base64 cu,
   roi moi den anh mac dinh. Gan bang JS de khong phai nhung chuoi
   base64 ~200KB vao attribute onerror cua HTML. */
const avatarImg =
  document.getElementById("profileAvatar");

if(avatarImg && avatarUrl){

  avatarImg.onerror = function(){

    avatarImg.onerror = null;

    avatarImg.src =
      currentUser.avatar
      ||
      "assets/images/default-avatar.png";
  };
}

/* Cover la CSS background nen khong co su kien loi tung anh —
   kiem tra bang cach preload, hong thi render lai. */
if(coverImageSrc){

  guardCoverImageSrc(
    coverImageSrc
  );
}
}


window.openCoverModal = function () {
    document.getElementById("coverModal").style.display = "flex";
    const presets = document.querySelectorAll(".coverPreset");
    const names = Object.keys(COVER_GRADIENTS);
    presets.forEach((card, index) => {
        const name = names[index];
        card.style.background = COVER_GRADIENTS[name];
        card.onclick = () => selectGradient(name);
    });
}


window.selectGradient = async function(name){
    try{
        await setDoc(
            doc(db,"users",getUID()),
            {
                coverType:"gradient",
                cover:name,
                coverImage: null,
                coverImageUrl: null
            },
            {
                merge:true
            }
        );
        closeCoverModal();
        showToast("Cover updated");
    }catch(err){
        console.error(err);
        showToast("Update failed");
    }
}


window.closeCoverModal=function(){
document.getElementById(
"coverModal"
).style.display="none";
}


window.uploadCover = function(){
    document
        .getElementById("coverInput")
        .click();
}


window.resetCover = async function () {
    try {
        await setDoc(
            doc(db, "users", getUID()),
            {
                coverType: null,
                cover: null,
                coverImage: null,
                coverImageUrl: null
            },
            {
                merge: true
            }
        );
        closeCoverModal();
        showToast("Cover reset");
    } catch (err) {
        console.error(err);
        showToast("Reset failed");
    }
};
/* =========================
   REALTIME USER — SINGLE READ PATH

   This listener is now the ONLY place that reads users/{uid}. It fires
   immediately with the current data, so loadCurrentUser() awaits the
   first snapshot instead of issuing its own getDoc() on the same
   document. Fields, ban check and the _uid marker behave exactly as
   before — only the NUMBER of reads changes (2 -> 1 per page load).
========================= */

let realtimeStarted = false;
let realtimeReady = null;
let realtimeResolve = null;

/* Hand the data to whoever is awaiting loadCurrentUser(). Resolving from
   the callback (including the very first snapshot) is what lets the
   caller resume without a second read. */
function settleRealtime(user){

  if(realtimeResolve){

    const resolve = realtimeResolve;

    realtimeResolve = null;

    resolve(user || null);
  }
}

window.startUserRealtime = function(){

  try{

    const uid =
      getUID();

    if(
      !uid ||
      uid === "guest"
    ){

      return null;
    }

    /* loadCurrentUser() and the home.html load handler both call in.
       Reuse the listener that is already open instead of subscribing to
       the same document twice. */
    if(realtimeStarted){

      return realtimeReady;
    }

    const ref =
      doc(
        db,
        "users",
        uid
      );

    realtimeReady =
      new Promise(
        resolve=>{

          realtimeResolve = resolve;
        }
      );

    realtimeStarted = true;

    onSnapshot(

      ref,

      (snap)=>{

        if(!snap.exists()){

          /* Missing document: resolve with null so loadCurrentUser()
             returns instead of waiting for a snapshot that never comes. */
          settleRealtime(null);

          return;
        }
const data = snap.data();

if(data.system?.status === "banned"){
    showToast("🚫 Bạn đã bị khóa!");
    localStorage.clear();
    window.location.href = "index.html";
    return;
}
        /* =========================
           UPDATE USER
        ========================= */

       window.currentUser = data;

window.currentUserData =
  currentUser;

/* Stamp the uid this snapshot belongs to. updateLinkButtons()
   (js/authLink.js) uses this marker to decide whether the in-memory
   copy is still trustworthy. Without it that guard always misses and
   authLink.js issues its own getDoc(users/{uid}), undoing the saving. */
window.currentUserData._uid = uid;

/* state.js is not loaded on lesson.html, so setUserState may not exist
   there. Inside a snapshot callback a ReferenceError would skip
   settleRealtime() below and leave loadCurrentUser() awaiting forever. */
if(typeof setUserState === "function"){

  setUserState(
    currentUser
  );
}

/* =========================
   UPDATE UI
========================= */

renderProfileCard();

/* =========================
   CHECKIN STATE
========================= */

/* lesson.html has no #streak — it loads this module too, so guard the
   write instead of throwing inside the snapshot callback. */
const streakEl =
  document.getElementById(
    "streak"
  );

if(streakEl){

  streakEl.innerText =
    currentUser.streak || 0;
}

window.currentUserStreak =
  currentUser.streak || 0;

window.currentLastCheckin =
  currentUser.lastCheckin || "";

/* Each refresh is isolated: a throw in one must not stop
   settleRealtime() from running, or loadCurrentUser() would never
   resolve and every await behind it would be blocked. */
try{

  if(
    window.renderDashboardPoints
  ){
    renderDashboardPoints();
  }

}catch(err){

  console.error(
    "DASHBOARD POINTS ERROR:",
    err
  );
}

try{

  if(
    window.updateCheckinButton
  ){
    updateCheckinButton();
  }

}catch(err){

  console.error(
    "CHECKIN BUTTON ERROR:",
    err
  );
}

        console.log(

          "REALTIME USER:",
          currentUser

        );

        /* Last: resume loadCurrentUser() and any other awaiter. */
        settleRealtime(currentUser);
      }
    );

  }catch(err){

    console.error(

      "REALTIME ERROR:",
      err

    );

    /* Never leave a caller waiting on a listener that failed to open. */
    settleRealtime(null);

    return realtimeReady;
  }
}
/* =========================
   CHANGE AVATAR and NAME
========================= */

window.changeAvatar =
function(){

  const input =
    document.getElementById(
      "avatarInput"
    );

  if(!input) return;

  input.click();
}



window.changeName = function(){
    const modal =
        document.getElementById(
            "changeNameModal"
        );
    const input =
        document.getElementById(
            "changeNameInput"
        );
    input.value =
        currentUser.name || "";
    modal.style.display="flex";
    setTimeout(()=>{
        input.focus();
        input.select();
    },50);
}


window.closeChangeName = function(){
    document
    .getElementById(
        "changeNameModal"
    )
    .style.display="none";
}



window.saveChangeName =
async function(){
    const input =
        document.getElementById(
            "changeNameInput"
        );
    const name =
        input.value.trim();
    if(name.length===0){
        showToast(
            "Tên không được để trống"
        );
        return;
    }
    if(name.length>30){
        showToast(
            "Tên tối đa 30 ký tự"
        );
        return;
    }
    try{await setDoc(
            doc(
                db,
                "users",
                getUID()),
            {name},
            {merge:true});
        closeChangeName();
        showToast(
            "Đã đổi tên"
        );
    }catch(err){
        console.error(err);
        showToast(
            "Đổi tên thất bại"
        );
    }
}


/* =========================
   AVATAR PICKER
========================= */

/* Maximum edge (px) applied before re-encoding.
   Avatar and cover are deliberately separate: the avatar renders in a small
   chip but is the single largest field of users/{uid}, so it drives Firestore
   egress; the cover is only a background layer behind a 70-80% white gradient,
   so it keeps its previous effective size instead of being shrunk too. */
const MAX_SIZE_AVATAR = 256;
const MAX_SIZE_COVER = 512;

async function compressImage(file, maxSize = MAX_SIZE_AVATAR) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round(height * maxSize / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round(width * maxSize / height);
          height = maxSize;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject("Compress failed");
            return;
          }

          const reader = new FileReader();

          reader.onloadend = () => {
            resolve(reader.result);
          };

          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.9
      );
    };

    img.onerror = reject;

    img.src = URL.createObjectURL(file);
  });
}



/* =========================
   BLOB UPLOAD (Phase 3)

   Truoc day avatar/cover duoc ghi thang vao Firestore duoi dang base64
   (~200 KB moi field), va moi lan doc users/{uid} la keo theo ca dong do
   — day chinh la thu lam no egress quota. Hai ham duoi day day bytes ra
   Vercel Blob va chi tra ve mot URL ngan.

   VI SAO PHAI LA URL CUNG ORIGIN
   /api/upload-image tra ve "/api/img/<id>", tuc la di qua proxy cung
   origin. Khong duoc luu URL blob truc tiep: js/certificateEngine.js ve
   avatar len #certificateCanvas roi lessonEngine.js goi toDataURL(), va
   file do khong bao gio set crossOrigin — mot anh khac origin se lam
   taint canvas va toDataURL() nem SecurityError, vo luon luong mint NFT.
   normalizeSameOriginUrl() duoi day chinh la hang rao do.

   VI SAO MOI LOI DEU QUAY VE BASE64
   Khong co phien Firebase (user dang nhap bang vi), API loi, hay mang
   loi — tat ca deu tra ve "" va luong cu chay tiep. Upload cua nguoi
   dung khong bao gio duoc phep hong chi vi buoc toi uu nay.
========================= */

/* Lay Firebase ID token de goi API.

   Dung import dong thay vi import tinh o dau file: neu CDN firebase-auth
   khong tai duoc thi mot import tinh se lam vo TOAN BO module nay (avatar
   picker, cover picker, doi ten, logout...), trong khi import dong chi
   khien buoc upload bi bo qua va quay ve base64.

   getAuth(app) voi dung `app` cua firebase.js de chac chan trung instance
   voi authEmail.js — neu khong, phien dang nhap email se khong duoc thay. */
async function getFirebaseIdToken(){

  try{

    /* `../firebase.js`, KHONG phai `./firebase.js`: file nay nam trong
       js/, con firebase.js nam o goc repo. `./firebase.js` tro toi
       /js/firebase.js (404) nen import() luon throw, roi vao catch ben
       duoi va tra "" -> moi lan upload deu am tham roi ve base64. */
    const firebase = await import("../firebase.js");

    const authMod = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
    );

    const auth = authMod.getAuth(firebase.app);

    /* Cho Firebase doc xong phien dang nhap da luu (IndexedDB) truoc khi
       doc currentUser. Lan dau mo trang, getAuth() tra ve mot instance ma
       currentUser con null trong khi SDK con dang doc persistence; doc ngay
       se thay null va am tham roi ve base64. authStateReady() resolve ngay
       khi currentUser san sang, va resolve lap tuc neu da co user, nen
       khong lam cham luong binh thuong. */
    await auth.authStateReady();

    const user = auth.currentUser;

    /* User dang nhap bang vi khong co phien Firebase Auth => null, va
       luong upload se quay ve base64 nhu truoc. */
    if(!user) return "";

    return await user.getIdToken();

  }catch(err){

    console.error(
      "Khong lay duoc ID token:",
      err && err.message
    );

    return "";
  }
}

/* =========================
   FIREBASE SESSION GATE (Phase 3e)
========================= */

/* User dang nhap bang vi (index.html:777-778 chi ghi localStorage
   "wallet"/"uid", KHONG tao phien Firebase Auth) nen getFirebaseIdToken()
   luon tra "" va upload se am tham ghi base64 vao Firestore. Ham nay cho
   biet co phien Firebase Auth hay khong, de chan upload truoc khi ghi.

   Tra ve false khi import loi hoac khong co user: ca hai truong hop deu
   khong the lay duoc ID token, nen deu phai chan. */
window.hcHasFirebaseSession =
async function(){

  try{

    const firebase = await import("../firebase.js");

    const authMod = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
    );

    const auth = authMod.getAuth(firebase.app);

    await auth.authStateReady();

    return !!auth.currentUser;

  }catch(err){

    console.error(
      "Khong kiem tra duoc phien Firebase:",
      err && err.message
    );

    return false;
  }
}

/* Tra ve URL cung origin, hoac "" khi that bai (moi truong hop). */
async function uploadImageToBlob(base64, kind){

  try{

    const token = await getFirebaseIdToken();

    if(!token) return "";

    const res = await fetch(
      "/api/upload-image",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
          kind,
          imageBase64: base64
        })
      }
    );

    if(!res.ok) return "";

    const data = await res.json();

    /* normalizeSameOriginUrl vua kiem tra cung origin vua chuan hoa, nen
       mot response bat thuong cung khong the dua URL khac origin vao
       Firestore. */
    return normalizeSameOriginUrl(data && data.url);

  }catch(err){

    console.error(
      "Upload blob that bai:",
      err && err.message
    );

    return "";
  }
}



window.initAvatarPicker =
function(){

  const input =
    document.getElementById(
      "avatarInput"
    );

  if(!input) return;

  input.onchange =
  async (e)=>{

    try{

      const file =
        e.target.files[0];

      if(!file) return;

      /* =========================
         ONLY IMAGE
      ========================= */

      if(
        !file.type.startsWith(
          "image/"
        )
      ){

        showToast(
          "File phải là ảnh"
        );

        return;
      }

      /* =========================
         READER
      ========================= */

     try {

    const base64 = await compressImage(
      file,
      MAX_SIZE_AVATAR
    );

    const uid = getUID();

    if (!uid) return;

    /* Phase 3e: khong co phien Firebase Auth (user vi) thi KHONG duoc ghi
       base64 vao Firestore nua. Truoc day nhanh nay am tham ghi base64
       ~200 KB roi van hien toast thanh cong, nen nguoi dung tuong da doi
       anh trong khi Firestore phinh to. Bao loi ro rang va dung han. */
    if(!(await window.hcHasFirebaseSession())){

      showToast(
        "Bạn đăng nhập bằng ví nên chưa đổi được ảnh. Hãy đăng nhập bằng email.",
        "error"
      );

      return;
    }

    /* Phase 3: day bytes ra Blob truoc, chi giu URL ngan trong Firestore. */
    const blobUrl = await uploadImageToBlob(
      base64,
      "avatar"
    );

    /* Chi con mot nhanh: co phien Firebase Auth thi uploadImageToBlob phai
       tra URL. Neu van tra "" (API loi, blob store chua bat, mang loi) thi
       bao loi va KHONG ghi gi ca - khong con duong nao ghi base64 vao
       Firestore tu day.

       `avatar` KHONG duoc dat null va KHONG duoc bo di: ca
       js/lessonEngine.js:403 va js/certificateEngine.js:80 deu doc
       `avatar` lam img.src, va hai file do deu bi khoa. Mot URL cung
       origin lam img.src tot y nhu base64, lai khong lam taint canvas. */
    if(!blobUrl){

      showToast("Upload thất bại", "error");

      return;
    }

    await setDoc(
        doc(db, "users", uid),
        {
          avatar: blobUrl,
          avatarUrl: blobUrl
        },
        {
            merge: true
        }
    );

    showToast("Đã cập nhật avatar");

} catch (err) {

    console.error(err);

    showToast("Upload thất bại");
}

    }catch(err){

      console.error(err);
    }
  };
}



window.initCoverPicker = function(){

  const input =
document.getElementById("coverInput");

  if(!input) return;

  input.onchange =
  async (e)=>{

    try{

      const file =
        e.target.files[0];

      if(!file) return;

      /* =========================
         ONLY IMAGE
      ========================= */

      if(
        !file.type.startsWith(
          "image/"
        )
      ){

        showToast(
          "File phải là ảnh"
        );

        return;
      }

      /* =========================
         READER
      ========================= */

     try {

    const base64 = await compressImage(
      file,
      MAX_SIZE_COVER
    );

    const uid = getUID();

    if (!uid) return;

    /* Phase 3e: giong nhanh avatar - user vi khong co phien Firebase Auth
       thi khong duoc ghi base64 vao Firestore, phai bao loi ro rang. */
    if(!(await window.hcHasFirebaseSession())){

      showToast(
        "Bạn đăng nhập bằng ví nên chưa đổi được ảnh. Hãy đăng nhập bằng email.",
        "error"
      );

      return;
    }

    /* Phase 3: day bytes ra Blob truoc, chi giu URL ngan trong Firestore. */
    const blobUrl = await uploadImageToBlob(
      base64,
      "cover"
    );

    /* Chi con mot nhanh: co phien Firebase Auth thi uploadImageToBlob phai
       tra URL. Neu van tra "" thi bao loi va KHONG ghi gi ca.

       `coverImage` giu nguyen ten field va van duoc ghi cung
       `coverImageUrl`; cover duoc ve bang CSS background nen khong co van
       de canvas taint, nhung van phai cung origin vi
       normalizeSameOriginUrl la hang rao duy nhat cua ca hai field. */
    if(!blobUrl){

      showToast("Upload thất bại", "error");

      return;
    }

    await setDoc(
        doc(db, "users", uid),
        {
          coverType: "image",
          coverImage: blobUrl,
          coverImageUrl: blobUrl,
          cover: null
        },
        {
            merge: true
        }
    );

    showToast("Đã cập nhật Cover");
closeCoverModal();
} catch (err) {

    console.error(err);

    showToast("Upload thất bại");
}

    }catch(err){

      console.error(err);
    }
  };

  /* =========================
     OPTIONAL COVER URL INPUT (field moi `coverImageUrl`)

     Chi chap nhan URL CUNG ORIGIN — xem khoi SAME-ORIGIN IMAGE URL GUARD.
     Neu #coverUrlInput khong ton tai thi bo qua hoan toan.
  ========================= */
  const coverUrlInput =
    document.getElementById("coverUrlInput");

  if(coverUrlInput){

    coverUrlInput.onchange = async (e)=>{

      const raw =
        e.target.value || "";

      if(!raw.trim()) return;

      const url =
        window.hcNormalizeSameOriginUrl
          ? window.hcNormalizeSameOriginUrl(raw)
          : "";

      if(!url){

        showToast("Chỉ nhận link cùng tên miền website");
        e.target.value = "";
        return;
      }

      const uid =
        getUID();

      if(!uid) return;

      try{

        await setDoc(
          doc(db, "users", uid),
          {
            coverType: "image",
            coverImageUrl: url,
            cover: null
          },
          {
            merge: true
          }
        );

        showToast("Đã cập nhật Cover");
        closeCoverModal();

      }catch(err){

        console.error(err);
        showToast("Upload thất bại");
      }
    };
  }
}

window.logout =
async function(){

  try{

    if(
      window.fullWalletDisconnect
    ){

      await fullWalletDisconnect();

    }else{

      localStorage.clear();

      sessionStorage.clear();

      window.location.href =
        "index.html";
    }

  }catch(err){

    console.error(
      "LOGOUT ERROR:",
      err
    );

    window.location.href =
      "index.html";
  }
}


document.addEventListener(
"keydown",
(e)=>{
const modal =
document.getElementById(
"changeNameModal"
);
if(
!modal ||
modal.style.display!=="flex"
)return;
if(e.key==="Escape"){
closeChangeName();
}
if(e.key==="Enter"){
saveChangeName();
}
});
