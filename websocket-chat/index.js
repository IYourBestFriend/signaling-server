const {app, BrowserWindow} = require('electron');

function createWindow() {
   const  win = new BrowserWindow()

    win.loadFile('index.html');
};
app.on('ready', createWindow);