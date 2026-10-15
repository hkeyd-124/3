import {
  doc,
  getDoc,
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
       FIRESTORE
    ========================= */

    const ref =
      doc(
        db,
        "users",
        uid
      );

    const snap =
      await getDoc(ref);

    if(!snap.exists()){

      console.warn(
        "User not found"
      );

      return null;
    }
/* =========================
   CHECK BAN
========================= */

const userData = snap.data();

if(userData.system?.status === "banned"){
    alert("🚫 Bạn đã bị khóa!");
    localStorage.clear();
    window.location.href = "index.html";
    return null;
}
    /* =========================
       SAVE GLOBAL
    ========================= */

   window.currentUser = userData;

window.currentUserData = currentUser;

setUserState(
  currentUser
);

console.log(

  "CURRENT USER:",
  currentUser

);

/* =========================
   UPDATE UI
========================= */

renderProfileCard();

/* =========================
   CHECKIN STATE
========================= */

document.getElementById(
  "streak"
).innerText =

  currentUser.streak || 0;

window.currentUserStreak =
  currentUser.streak || 0;

window.currentLastCheckin =
  currentUser.lastCheckin || "";

/* REMOVED: renderDashboardPoints() used to be called here. It was the
   SECOND of two calls per page load — the onSnapshot callback in
   startUserRealtime() below already re-renders the points whenever
   users/{uid} changes (including the very first snapshot), so this
   duplicate only re-ran getTotalLessonScore() and doubled the cost of
   the lessons query.

   Deliberately NOT replaced with a "skip first snapshot" flag in the
   callback: that would make the displayed points depend on a race
   between this fetch and the first snapshot. Dropping the duplicate
   keeps exactly one render whichever way the race goes. */

if(
  window.updateCheckinButton
){
  updateCheckinButton();
}

return currentUser;

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

  
  if(
    !box ||
    !currentUser
  ) return;

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
        "
      >

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
   REALTIME USER
========================= */

window.startUserRealtime = function(){

  try{

    const uid =
      getUID();

    if(
      !uid ||
      uid === "guest"
    ){

      return;
    }

    const ref =
      doc(
        db,
        "users",
        uid
      );

    onSnapshot(

      ref,

      (snap)=>{

        if(!snap.exists()){
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

setUserState(
  currentUser
);

/* =========================
   UPDATE UI
========================= */

renderProfileCard();

/* =========================
   CHECKIN STATE
========================= */

document.getElementById(
  "streak"
).innerText =

  currentUser.streak || 0;

window.currentUserStreak =
  currentUser.streak || 0;

window.currentLastCheckin =
  currentUser.lastCheckin || "";

if(
  window.renderDashboardPoints
){
  renderDashboardPoints();
}

if(
  window.updateCheckinButton
){
  updateCheckinButton();
}

        console.log(

          "REALTIME USER:",
          currentUser

        );
      }
    );

  }catch(err){

    console.error(

      "REALTIME ERROR:",
      err

    );
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
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      const MAX_SIZE = 768;

      if (width > height) {
        if (width > MAX_SIZE) {
          height = Math.round(height * MAX_SIZE / width);
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = Math.round(width * MAX_SIZE / height);
          height = MAX_SIZE;
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

    const base64 = await compressImage(file);

    const uid = getUID();

    if (!uid) return;

    /* Giu nguyen field cu `avatar` (base64) va xoa field moi `avatarUrl`
       de mot URL cu khong the de len anh vua chon. */
    await setDoc(
        doc(db, "users", uid),
        {
            avatar: base64,
            avatarUrl: null
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

    const base64 = await compressImage(file);

    const uid = getUID();

    if (!uid) return;

    /* Giu nguyen field cu `coverImage` (base64) va xoa field moi
       `coverImageUrl` de mot URL cu khong the de len anh vua chon. */
    await setDoc(
        doc(db, "users", uid),
        {
            coverType: "image",
            coverImage: base64,
            coverImageUrl: null,
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
