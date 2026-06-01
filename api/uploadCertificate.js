export default async function handler(
  req,
  res
){

  if(req.method !== "POST"){

    return res
      .status(405)
      .json({
        error:"Method not allowed"
      });

  }

  try{

    const {
      imageBase64,
      fileName
    } = req.body;

    if(!imageBase64){

      return res
        .status(400)
        .json({
          error:"Missing image"
        });

    }

    const buffer =
      Buffer.from(
        imageBase64,
        "base64"
      );

    const formData =
      new FormData();

    const blob =
      new Blob(
        [buffer],
        {
          type:"image/png"
        }
      );

    formData.append(
      "file",
      blob,
      fileName || "certificate.png"
    );

    const response =
      await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method:"POST",
          headers:{
            Authorization:
              `Bearer ${process.env.PINATA_JWT}`
          },
          body:formData
        }
      );

    const result =
      await response.json();

    return res
      .status(200)
      .json({
        cid:
          result.IpfsHash
      });

  }catch(err){

    console.error(err);

    return res
      .status(500)
      .json({
        error:
          err.message
      });

  }

}
