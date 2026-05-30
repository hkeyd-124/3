window.rankConfig = [

  {
    rank:"SSS",
    min:420
  },

  {
    rank:"SS",
    min:390
  },

  {
    rank:"S",
    min:340
  },

  {
    rank:"A",
    min:280
  },

  {
    rank:"B",
    min:200
  },

  {
    rank:"C",
    min:0
  }

];

window.getTier = function(score){

  for(const tier of rankConfig){

    if(score >= tier.min){

      return tier.rank;
    }
  }

  return "C";
}
