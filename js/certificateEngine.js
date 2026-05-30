window.generateCertificatePreview =
async function(data){

  const tier =
    data.tier;

  const templateSrc =

    certificateTemplates[
      tier
    ];

  const canvas =

    document.createElement(
      "canvas"
    );

  canvas.width =
    certificateLayout.width;

  canvas.height =
    certificateLayout.height;

  const ctx =
    canvas.getContext(
      "2d"
    );

  // TEMPLATE

  const template =
    new Image();

  template.src =
    templateSrc;

  await new Promise(
    resolve=>{

      template.onload =
        resolve;
    }
  );

  ctx.drawImage(

    template,

    0,

    0,

    canvas.width,

    canvas.height

  );
// AVATAR

if(data.avatar){

  const avatarImg =
    new Image();

  avatarImg.src =
    data.avatar;

  await new Promise(
    resolve=>{
      avatarImg.onload =
        resolve;
    }
  );

  ctx.save();

  ctx.beginPath();

  ctx.arc(

    certificateLayout
      .avatar.x,

    certificateLayout
      .avatar.y,

    certificateLayout
      .avatar.radius,

    0,

    Math.PI * 2

  );

  ctx.closePath();

  ctx.clip();

  ctx.drawImage(

    avatarImg,

    certificateLayout
      .avatar.x
      -
      certificateLayout
      .avatar.radius,

    certificateLayout
      .avatar.y
      -
      certificateLayout
      .avatar.radius,

    certificateLayout
      .avatar.radius * 2,

    certificateLayout
      .avatar.radius * 2

  );

  ctx.restore();
}
  // NAME

ctx.fillStyle =
  "#0b2a5b";

ctx.textAlign =
  certificateLayout
  .studentName
  .align;

const studentName =

  data.name
  .toUpperCase();

let fontSize =

  certificateLayout
  .studentName
  .fontSize;

ctx.font =
  `bold ${fontSize}px Georgia`;

while(

  ctx.measureText(
    studentName
  ).width > 650

  &&

  fontSize > 34

){

  fontSize -= 2;

  ctx.font =
    `bold ${fontSize}px Georgia`;

}

ctx.fillText(

  studentName,

  certificateLayout
    .studentName.x,

  certificateLayout
    .studentName.y

);

  // LESSON

  ctx.font =

    `bold ${
      certificateLayout
      .lessonName
      .fontSize
    }px Arial`;

  ctx.fillStyle =
  "#ffffff";
  ctx.fillText(
    data.lesson,

    certificateLayout
    .lessonName.x,

    certificateLayout
    .lessonName.y

  );

  // SCORE

  ctx.font =

    `bold ${
      certificateLayout
      .score
      .fontSize
    }px Arial`;
ctx.fillStyle =
  "#0b2a5b";
  ctx.fillText(

    `${data.score}/${data.maxScore}`,

    certificateLayout
      .score.x,

    certificateLayout
      .score.y

  );
// DATE

const today =

  new Date()
  .toLocaleDateString(
    "vi-VN"
  );

ctx.fillStyle =
  "#0b2a5b";

ctx.textAlign =
  "center";



ctx.font =
  "bold 24px Arial";

ctx.fillText(

  today,

  380,

  865

);
  return canvas;
};
