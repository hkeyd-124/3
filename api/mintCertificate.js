import { ethers } from "ethers";
import { db } from "./firebaseAdmin.js";

const CONTRACT_ADDRESS =
  process.env.CONTRACT_ADDRESS;

const ABI = [

  "function mintCertificate(address student,string lessonId,string metadataURI) returns (uint256)",

  "function hasMintedLesson(address student,string lessonId) view returns (bool)"

];

export default async function handler(
  req,
  res
){

  try{

    if(req.method !== "POST"){

      return res.status(405).json({
        error:"Method not allowed"
      });

    }

    const {

      uid,
      lessonId,
      wallet,
      metadataURI

    } = req.body;

    if(
      !uid ||
      !lessonId ||
      !wallet ||
      !metadataURI
    ){

      return res.status(400).json({
        error:"Missing data"
      });

    }

    const lessonRef =
      db
      .collection("users")
      .doc(uid)
      .collection("lessons")
      .doc(lessonId);

    const lessonSnap =
      await lessonRef.get();

    if(!lessonSnap.exists){

      return res.status(404).json({
        error:"Lesson not found"
      });

    }

    const lessonData =
      lessonSnap.data();

    if(
      !lessonData.completed
    ){

      return res.status(400).json({
        error:"Lesson not completed"
      });

    }

    if(
      lessonData.certificateMinted
    ){

      return res.status(400).json({
        error:"Certificate already minted"
      });

    }

    const provider =
      new ethers.JsonRpcProvider(
        process.env.SEPOLIA_RPC_URL
      );

    const signer =
      new ethers.Wallet(
        process.env.OWNER_PRIVATE_KEY,
        provider
      );

    const contract =
      new ethers.Contract(
        CONTRACT_ADDRESS,
        ABI,
        signer
      );

    const tx =
      await contract.mintCertificate(

        wallet,

        lessonId,

        metadataURI

      );

    const receipt =
      await tx.wait();

    const tokenId =
      receipt.logs?.[0]
      ? Number(
          receipt.logs[0].topics[3]
        )
      : null;

    await lessonRef.update({

      certificateMinted:true,

      mintedAt:
        new Date().toISOString(),

      metadataURI,

      mintedTokenId:
        tokenId

    });

    return res.status(200).json({

      success:true,

      tokenId,

      txHash:
        receipt.hash

    });

  }catch(err){

    return res.status(500).json({

      success:false,

      error:
        err.message

    });

  }

}
