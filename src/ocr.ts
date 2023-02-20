import Jimp from "jimp";
import {BrowserWindow} from "electron";
import {Coordinates} from "./coordinates";

export async function processScreenshot(jmp: Jimp, mainWindow: BrowserWindow) {
    const resized = await jmp.resize(Coordinates.screen.width, Coordinates.screen.height);
    mainWindow.webContents.send('imageContent', 'resized', await resized.getBase64Async('image/png'));

    const grayscale = await resized.clone().grayscale();
    mainWindow.webContents.send('imageContent', 'grayscale', await grayscale.getBase64Async('image/png'));

    const inverted = await grayscale.clone().invert();
    mainWindow.webContents.send('imageContent', 'inverted', await inverted.getBase64Async('image/png'));

    const contrast = await inverted.clone().contrast(0.1)
    mainWindow.webContents.send('imageContent', 'contrast', await contrast.getBase64Async('image/png'));

    ///////////

    const alliesListImg = await contrast.clone()
        .crop(Coordinates.scoreboard.allies.from[0], Coordinates.scoreboard.allies.from[1],
            Coordinates.scoreboard.allies.size[0], Coordinates.scoreboard.allies.size[1]);
    await processPlayerList('allies', alliesListImg, mainWindow);

    const enemiesListImg = await contrast.clone()
        .crop(Coordinates.scoreboard.enemies.from[0], Coordinates.scoreboard.enemies.from[1],
            Coordinates.scoreboard.enemies.size[0], Coordinates.scoreboard.enemies.size[1]);
    await processPlayerList('enemies', enemiesListImg, mainWindow);

    await processSelf(contrast.clone(), mainWindow);
}

async function processPlayerList(type: 'allies' | 'enemies', jmp: Jimp, mainWindow: BrowserWindow) {
    //TODO
}

async function processSelf(jmp: Jimp, mainWindow: BrowserWindow) {
    //TODO
}
