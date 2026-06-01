import { db }
from "./firebaseAdmin.js";

export default async function handler(
  req,
  res
){

  try{

    const snap =
      await db
        .collection("users")
        .limit(1)
        .get();

    return res.status(200).json({

      ok:true,

      count:
        snap.size

    });

  }catch(err){

    return res.status(500).json({

      ok:false,

      error:
        err.message

    });

  }

}
