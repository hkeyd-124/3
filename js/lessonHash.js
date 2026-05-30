window.getLessonHash =
function(lessonId){

  return ethers.keccak256(

    ethers.toUtf8Bytes(

      lessonId
        .trim()
        .toLowerCase()

    )

  );
}
