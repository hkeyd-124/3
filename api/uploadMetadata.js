export default async function handler(
  req,
  res
){

  if(req.method !== "POST"){

    return res.status(405).json({
      error:"Method not allowed"
    });

  }

  try{

    const metadata =
      req.body;

    const response =
      await fetch(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
          method:"POST",

          headers:{
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${process.env.PINATA_JWT}`
          },

          body:
            JSON.stringify(
              metadata
            )
        }
      );

    const result =
      await response.json();

    return res.status(200).json({

      success:true,

      cid:
        result.IpfsHash,

      metadataURI:
        `ipfs://${result.IpfsHash}`

    });

  }catch(err){

    console.error(err);

    return res.status(500).json({

      success:false,

      error:
        err.message

    });

  }

}
