import Jimp from "jimp";
import {BrowserWindow, app} from "electron";
import {Coordinates} from "./coordinates";

import {createWorker}  from 'tesseract.js';

export function init() {
}

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

    // await processSelf(contrast.clone(), mainWindow);
}

async function processPlayerList(type: 'allies' | 'enemies', jmp: Jimp, mainWindow: BrowserWindow) {
    //TODO
}

async function processSelf(jmp: Jimp, mainWindow: BrowserWindow) {
    const selfName = await jmp.clone()
        .crop(Coordinates.self.name.from[0], Coordinates.self.name.from[1],
            Coordinates.self.name.size[0], Coordinates.self.name.size[1]);
    const selfHero = await jmp.clone()
        .crop(Coordinates.self.hero.from[0], Coordinates.self.hero.from[1],
            Coordinates.self.hero.size[0], Coordinates.self.hero.size[1]);

    ocr(selfName)
    ocr(selfHero)
    //TODO
}

async function ocr(jmp: Jimp) {
    const worker = await createWorker({
        logger: m => console.log(m),
    });
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const buffer = await jmp.getBufferAsync('image/png');
    const recognized = await worker.recognize(buffer);
    console.log(recognized);
}
