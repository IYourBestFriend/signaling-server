"use strict";

const WebSocket = require('ws');

let connectionArray = [];
let nextID = 1;
let appendToMakeUnique = 1;


const wss = new WebSocket.Server({port:6502},()=>{
  console.log(`${new Date().toLocaleString('ru')} Server is listening on port 6502`)
});


function isUsernameUnique(name) {
  const length = connectionArray.length - 1;

  for (let i=0; i<length; i++) {
    if (connectionArray[i].username === name) return true;
  }
  return false;
}

function getConnectionForID(id) {
  let connect = null;

  for (let i=0; i<connectionArray.length; i++) {
    if (connectionArray[i].clientID === id) {
      connect = connectionArray[i];
      break;
    }
  }

  return connect;
}

function makeUserListMessage() {
  let userListMsg = {
    type: "userlist",
    users: []
  };
  

  // Add the users to the list

  for (let i=0; i<connectionArray.length; i++) {
    userListMsg.users.push(connectionArray[i].username);
  }

  return userListMsg;
}

function sendUserListToAll() {
  let userListMsg = makeUserListMessage();
  let userListMsgStr = JSON.stringify(userListMsg);

  for (let i=0; i<connectionArray.length; i++) {
    connectionArray[i].send(userListMsgStr);
  }
}

wss.on('connection', (ws)=> {

  console.log(`${new Date().toLocaleTimeString('ru')} connection accepted.`);

  connectionArray.push(ws);

  // Send the new client its token; it will
  // respond with its login username.

  ws.clientID = nextID;
  nextID++;

  let msg = {
    type: "id",
    id: ws.clientID
  };
  ws.send(JSON.stringify(msg));

  // Handle the "message" event received over WebSocket. This
  // is a message sent by a client, and may be text to share with
  // other users or a command to the server.

  ws.on('message', function(message) {
          msg = JSON.parse(message);
          console.log(msg);
          let connect = getConnectionForID(msg.id);

          switch(msg.type) {
            case "message":
              msg.name = connect.username;
              msg.text = msg.text.replace(/(<([^>]+)>)/ig,"");
              break;
            case "username":
              let nameChanged = false;
              let origName = msg.name;

              if (isUsernameUnique(msg.name)) {
                msg.name = origName + appendToMakeUnique;
                appendToMakeUnique++;
                nameChanged = true;
              }

              if (nameChanged) {
                let changeMsg = {
                  id: msg.id,
                  type: "rejectusername",
                  name: msg.name
                };
                connect.send(JSON.stringify(changeMsg));
              }

              connect.username = msg.name;
              sendUserListToAll();
              break;
          }

          // Convert the message back to JSON and send it out
          // to all clients.

         
            let msgString = JSON.stringify(msg);

            if (msg.target && msg.target !== undefined && msg.target.length !== 0) {
              sendToOneUser(msg.target, msgString);
            } else {
              for (let i=0; i<connectionArray.length; i++) {
                connectionArray[i].send(msgString);
              }
            }
        
      
  });
  
  ws.on('close', function() {
    connectionArray = connectionArray.filter(function(el) {
      return (el.readyState === 1 );
    });
    sendUserListToAll();  // Update the user lists
    console.log(`${new Date().toLocaleString('ru')} Peer disconnected.`);
  });
});

function sendToOneUser(target, msgString) {
  for (let i=0; i<connectionArray.length; i++) {
    if (connectionArray[i].username === target) {
      connectionArray[i].send(msgString);
      break;
    }
  }
}