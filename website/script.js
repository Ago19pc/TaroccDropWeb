let socket = null;

window.onload = function () {
    if (!window.location.pathname.endsWith('/index.html')) {
        return;
    }
    const username = localStorage.getItem('username');
    socket = new WebSocket(location.href.split(":")[0] === 'https' ? 'wss' : 'ws' + '://' + location.hostname + ':8080');
    // Event listener for when the connection is open
    socket.addEventListener('open', () => {
        console.log('WebSocket connection established!');
    });

    // Event listener for receiving messages from the server
    socket.addEventListener('message', (event) => {
        console.log('Message from server: ', event.data);
        parserActualizer(parseMessage(event.data));
    });

    // Event listener for when the connection is closed
    socket.addEventListener('close', () => {
        console.log('WebSocket connection closed!');
    });

    // Event listener for error
    socket.addEventListener('error', (error) => {
        console.error('WebSocket error: ', error);
    });
}


 
function login() {
    if (username){
        const username = document.getElementById('username').value;
        socket.send(JSON.stringify({action: 'login', username: username}));
    }
}

function logout(){
    socket.send(JSON.stringify({action: 'logout', username: localStorage.getItem('username')}));
    localStorage.removeItem('username');
    document.body.innerHTML = indexHtml;
}


function parseMessage(message) {
    message = message.toString();
    try {
        return JSON.parse(message);
    } catch (error) {
        console.error('Invalid JSON', message);
        return {};
    }
}

function parserActualizer(message) {
    switch (message.action){
        case 'login':
            switch (message.status)  {
                case 'error':
                    console.error('Error logging in', message.message);
                    document.getElementById('usernameError').setAttribute('style', 'display: block; color : red; text-align: center;');
                    document.getElementById('username').value = 'Invalid username';
                    break;
                case 'success':
                    localStorage.setItem('username', username);
                    //window.location.href = './communication.html';
                    document.body.innerHTML = commHtml;
                    break;
            }

        break;

        case 'updateList':
            const userList = document.getElementById('userList');
            userList.innerHTML = ''; // Clear the list first

            message.users.forEach((user) => {
            const li = document.createElement('li'); // Create a list item
            const button = document.createElement('button'); // Create a button

            button.textContent = user; // Set button text to the user's name
            button.onclick = function() { // Add an onclick event to the button
                drop(user); // Call the drop function with the user's name
                console.log(`Button clicked for ${user}`);
            };

            button.classList.add('bg-blue-500', 'hover:bg-blue-400', 'text-white', 'font-bold', 'py-2', 'px-4', 'border-b-4', 'border-blue-700', 'hover:border-blue-500', 'rounded');

            li.appendChild(button); // Append the button to the list item
            userList.appendChild(li); // Append the list item to the ul
            
        });
        break;

        case 'drop':
            const pendingDownloads = document.getElementById('pendingDownloads');
            const li = document.createElement('li');
            const dButton = document.createElement('img');
            dButton.src = './download.png';
            dButton.onclick = function() {
                download(message);
                console.log(`Button clicked for ${message.name}`);
            };
            const text = document.createElement('span');
            text.textContent = `${message.name} from ${message.from}`;
            li.appendChild(text);
            li.appendChild(dButton);
            pendingDownloads.appendChild(li);
        break;
    }
}

function drop(user) {
    console.log('Dropping file to', user);
    toSend = document.getElementById('files').files;
    if (toSend.length === 0) {
        console.error('No files selected');
        return;
    }
    Array.from(toSend).forEach(file => {
        // Read each file as ArrayBuffer (for binary data)
        
        const reader = new FileReader();
        
        reader.onload = function(event) {


            const fileData = event.target.result;
            // Send file data through WebSocket

            blobToBase64(new Blob([fileData])).then((base64) => {
                const fileMessage = {
                    action: 'drop',
                    from: localStorage.getItem('username'),
                    target: user,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: base64 // the binary data (ArrayBuffer)
                };


                // Send the file object over WebSocket
                socket.send(JSON.stringify(fileMessage));
                console.log(`Sending file: ${file.name}`);
            });
        }
        reader.readAsArrayBuffer(file);
    });
} 

function download(message) {
    // Extract the file details from the message
    const { name, type, size, data } = message;


    let blob;

    fetch(data)
        .then(res => res.blob())
        .then(res => {
            blob = res;
            // Create a temporary download link and simulate a click
            const link = document.createElement('a');
            link.href = (!window.webkitURL ? URL: window.webkitURL).createObjectURL(blob); // Create an object URL for the file
            link.download = name; // Set the download attribute to the file name
            document.body.appendChild(link); // Append the link to the DOM (it must be part of the DOM to trigger a click)
            link.click(); // Trigger the download
            document.body.removeChild(link); // Clean up by removing the link element
        });
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            resolve(reader.result);
        };
        reader.onerror = reject;
    });
}




commHtml = '<body style="display: flex; align-items: center; flex-direction: column; gap: 3vh; background-image: url(noapple.png); background-repeat: repeat;"> \
    \
    <div style="background-color: white; gap: 3vh; display: flex; flex-direction: column; \
                border-style: solid; border-width: 5px; border-color: black; border-radius: 10px;"> \
        <h1 style="text-align: center;">Pick a file and a bully</h1> \
        \
        <img src="./TaroccDrop.png" alt="logo" width="200px" style="align-self: center;"> \
        \
        <input style="width: 20vw;" type="file" id="files" multiple> \
        \
        <h1 style="text-align: center;">Available Users</h1> \
        <ul id="userList"></ul> \
        \
        <h1 style="text-align: center;">Pending downloads</h1> \
        <ul id="pendingDownloads"></ul> \
    </div> \
\
</body>';

indexHtml = '<body style="display: flex; align-items: center; flex-direction: column; gap: 3vh; background-image: url(noapple.png); background-repeat: repeat;">\
\
    <div style="background-color: white; gap: 3vh; display: flex; flex-direction: column; \
                border-style: solid; border-width: 5px; border-color: black; border-radius: 10px;">\
\
        <h1 style="text-align: center;">Welcome to TaroccDrop</h1>\
        \
        <img src="./TaroccDrop.png" alt="logo" width="200px" style="align-self: center;">\
        \
        <p id="usernameError" style="text-align : center; color: red; display: none;">Invalid Username</p>\
        <input style="width: 20vw; display: block;" type="text" id="username" placeholder="Username" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">\
        <button style="width: 20vw; display: block;" class="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 border-b-4 border-blue-700 hover:border-blue-500 rounded" onclick="login()">Login</button>\
        \
    </div>\
\
</body>';