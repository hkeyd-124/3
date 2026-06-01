export default async function handler(
  req,
  res
){

  return res.status(200).json({

    hasPinataKey:
      !!process.env.PINATA_JWT,

    firstChars:
      process.env.PINATA_JWT
      ? process.env.PINATA_JWT.slice(0,8)
      : null

  });

}
