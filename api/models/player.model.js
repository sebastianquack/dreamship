module.exports = function (mongoose) {
  let modelName = "player";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({  
  });
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
      createAuth: false,
    }
  };
  
  return Schema;
};