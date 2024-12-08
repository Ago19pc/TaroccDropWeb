// server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080, maxPayload: 2e9 });

/**
 * @type {Object.<string, WebSocket>}
 */
const users = {};


wss.on('connection', (ws) => {
  console.log('Client connected');
    ws.on('message', (message) => {
        console.log('Message received', JSON.parse(message));
        message = parseMessage(message);
        const username = Object.keys(users).find(username => users[username] === ws);
        switch(message.action) {
            case 'login':
                if (message.username != undefined){
                    if (users[username] != undefined){
                        ws.send(JSON.stringify({action: 'login', status: 'error', message: 'Username already in use'}));
                    } else {
                        users[message.username] = ws;
                        console.log('User connected', message.username);
                        ws.send(JSON.stringify({action: 'login', status: 'success'}));
                        
                        updateList();
                    }
                }
                break;
            case 'drop':
                console.log('File dropped');
                if (message.target != undefined && users[message.target] != undefined){
                    users[message.target].send(JSON.stringify({action: 'drop', from: message.from, 
                        name: message.name,
                        type: message.type,
                        size: message.size,
                        data: message.data
                    }));
                    console.log(message.from, ' sent file to ', message.target);
                } else {
                    if (message.target == undefined){
                        console.error('No target specified');
                    } else {
                        console.error('Target not found');
                    }
                }
                break;
            case 'logout':
                if (message.username != undefined){
                    console.log('User logged-out', username);
                    delete users[username];
                }
                break;
            default:
                console.error('Invalid action', message.action);
                break;
        }
        
  });

    ws.on('close', () => {
        console.log("Client disconnected");
        Object.entries(users).forEach(([username, oldws]) => {
            if (oldws === ws) {
                console.log('User disconnected', username);
                delete users[username];
            }
        });
        updateList();
    });
});

console.log('WebSocket server is running on ws://localhost:8080');



function parseMessage(message) {
    message = message.toString();
    try {
        return JSON.parse(message);
    } catch (error) {
        console.error('Invalid JSON', message);
        return {};
    }
}


function updateList(){
    Object.keys(users).forEach(user => {
        const allUsersExceptCurrent = Object.keys(users).filter(u => u !== user);
        users[user].send(JSON.stringify({action: 'updateList', users: allUsersExceptCurrent}));
    });
}