import {desktopCapturer, BrowserWindow, ipcMain} from "electron";

declare const RENDER_OFFSCREEN_WEBPACK_ENTRY: string;

let mainWindow: BrowserWindow;
// let renderWindow: BrowserWindow;

export async function init(_mainWindow: BrowserWindow) {
    mainWindow = _mainWindow;
    // renderWindow = new BrowserWindow({
    //     webPreferences: {
    //         offscreen: true,
    //         nodeIntegration: true,
    //         contextIsolation: false,
    //     }
    // });
    // await renderWindow.loadURL(RENDER_OFFSCREEN_WEBPACK_ENTRY);
    // // renderWindow.webContents.on('paint', (event, dirty, image) => {
    // //     fs.writeFileSync('ex.png', image.toPNG())
    // // })
    // renderWindow.webContents.setFrameRate(1);
    // renderWindow.webContents.openDevTools();
    // renderWindow.minimize();

    // ipcMain.on('initVideo', (e) => {
    //     console.log("initVideo")
    //     desktopCapturer.getSources({types: ['screen']}).then(async sources => {
    //         renderWindow.webContents.send('setSource', sources[0].id);
    //         for (const source of sources) {
    //             console.log(source);
    //         }
    //     })
    // })
    //
    // ipcMain.on('screenshotContent', (e, screenshot) => {
    //     console.log("screenshotContent")
    //     let focusedWindow = BrowserWindow.getFocusedWindow();
    //     if (!focusedWindow) return;
    //     focusedWindow.webContents.send('screenshotContent', screenshot);
    // })
    //
    // ipcMain.on('takeScreenshot', (e) => {
    //     takeScreenshot();
    // });
}

export function takeScreenshot(): Promise<string> {
    console.log("takeScreenshot")
    mainWindow.webContents.send('takeScreenshot');

    return new Promise(resolve => {
        ipcMain.once('screenshotContent', (e, screenshot) => {
            resolve(screenshot);
        })
    })
}
