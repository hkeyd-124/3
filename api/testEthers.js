import { ethers }
from "ethers";

export default async function handler(
  req,
  res
){

  return res.status(200).json({

    ethersVersion:
      ethers.version

  });

}
