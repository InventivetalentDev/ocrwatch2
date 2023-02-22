import {app, BrowserWindow, desktopCapturer, ipcMain, session} from 'electron';
import Jimp from "jimp";
import {Coordinates} from "./coordinates";
import {
    tapAfterEnvironmentToPatchWatching
} from "fork-ts-checker-webpack-plugin/lib/hooks/tap-after-environment-to-patch-watching";
// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

process.on('uncaughtException', function (error) {
    console.log(error);

});

const createWindow = async (): Promise<void> => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        height: 600,
        width: 800,
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    mainWindow.webContents.setFrameRate(1);


    // globalShortcut.register('Tab',()=>{
    //     console.log("tab pressed!")
    // })

    // and load the index.html of the app.
    await mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

    mainWindow.on('closed', e => {
        app.quit();
    })

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ['']
            }
        })
    })

    ipcMain.on('initVideo', (e) => {
        console.log("initVideo")
        desktopCapturer.getSources({types: ['screen']}).then(async sources => {
            mainWindow.webContents.send('setSource', sources[0].id);
            for (const source of sources) {
                console.log(source);
            }
        })
    })


    // setInterval(async () => {
    //     if (!mainWindow) return;
    //     if (!mainWindow.webContents) return;
    //     await loop(mainWindow)
    // }, 5 * 1000);
    // setTimeout(() => {
    //     loop(mainWindow)
    // }, 2000);
};

// async function loop(mainWindow: BrowserWindow) {
//     try {
//         mainWindow.webContents.send('takingScreenshot');
//         const shot = await screenshot.takeScreenshot();
//         if(!shot) return;
//         const jmp = await Jimp.read(Buffer.from(shot.substring('data:image/png;base64,'.length), 'base64'));
//
//         await ocr.processScreenshot(jmp);
//     } catch (e) {
//         console.error(e);
//     }
// }

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.