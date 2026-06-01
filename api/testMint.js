export default async function handler(
  req,
  res
){

  const response =
    await fetch(
      `${req.headers.origin}/api/mintCertificate`,
      {
        method:"POST",
        headers:{
          "Content-Type":
            "application/json"
        },
        body:JSON.stringify({

          uid:
            "uid_5a7638f2-9e11-47e9-bfd9-478e69c0ab4e",

          lessonId:
            "organic_1",

          wallet:
            "0x3c5945b76525e83650f3faa2923d6fa8ecf1ee81",

          metadataURI:
            "ipfs://QmTest"

        })

      }
    );

  const data =
    await response.json();

  return res
    .status(200)
    .json(data);

}
