const {VM} = require('vm2');
const db = require('./dbutil.js');

module.exports.run = async function(node, playerId, hook, msg, callback) {
  let sentResponse = false;

  let t = setTimeout(()=>{
    sentResponse = true;
    callback("timeout"); // timeout for awaiting async script effects
  }, 10000);

  let result = {
    outputs: [],
    moveTo: null
  };

  let varCache = {
    player: await db.getVars("player", {playerId}),
    node: await db.getVars("node", {nodeId: node._id}),
    playerNode: await db.getVars("playerNode", {nodeId: node._id, playerId}),
    board: await db.getVars("board", {boardId: node.board}),
  }

  // default values
  if(!varCache.board.narrator) varCache.board.narrator = "narrator";

  const vm = new VM({
    timeout: 1000, // timeout for script exeuction
    sandbox: {
      player: {
        ...varCache.player,
        set: (key, value) => { 
          varCache.player[key] = value;
          db.setVar("player", {playerId}, key, value); 
        },
      },
      here: {
        ...varCache.node,
        set: (key, value) => { 
          varCache.node[key] = value;
          db.setVar("node", {nodeId: node._id}, key, value); 
        },
      },
      playerHere: {
        ...varCache.playerNode,
        set: (key, value) => { 
          varCache.playerNode[key] = value;
          db.setVar("playerNode", {playerId, nodeId: node._id}, key, value); 
        },
      },
      board: {
        ...varCache.board,
        set: (key, value) => { 
          varCache.board[key] = value;
          db.setVar("board", {boardId: node.board}, key, value); 
        },
      },
      output: (text, label=varCache.board.narrator) => { result.outputs.push({text, label}); },
      option: (text) => { result.outputs.push({text, option: true}); },       
      moveTo: (room) => { result.moveTo = room; },
    }  
  });

  let board = await db.getBoard(node.board);

  let runScript = board.library + " ; " + node.script;
  let msgProcessed = msg ? msg.trim().toLowerCase() : "";

  // expand script to execute appropriate hook
  switch(hook) {
    case "onMessage":
      runScript += `; if(typeof onMessage === "function") onMessage("${msgProcessed}");`; 
      break;
    case "onArrive":
      runScript += `; if(typeof onArrive === "function") onArrive();`; 
      break;
  }
  //console.log("runScript", runScript);

  try {
    let output = await vm.run(runScript);
    //console.log("script output: " + output);
    //console.log(result);
    clearTimeout(t);
    if(!sentResponse) {
      callback(result); 
    }
  } catch (err) {
    clearTimeout(t);
    console.error('script execution failed!', err);
    if(!sentResponse) {
      callback({error: err.toString()});  
    }
  }
}

