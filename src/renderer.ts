import './index.css';

import {desktopCapturer, ipcRenderer} from 'electron';
import {Coordinates} from "./coordinates";
import {createWorker, Worker} from "tesseract.js";
import Jimp from "jimp/es";
import {Rect} from "./types";

console.log('👋 This message is being logged by "renderer.js", included via webpack');

setTimeout(() => {
    ipcRenderer.send('initVideo');
}, 1000);
setTimeout(() => {
    takeScreenshot()
}, 1200);

setInterval(() => {
    takeScreenshot();
}, 5000);

const imageTypes: Set<string> = new Set<string>();

document.getElementById('screenshotBtn').addEventListener('click', e => {
    console.log("screenshotBtn takeScreenshot")
    takeScreenshot();
});

const imageSelect = document.getElementById('imageSelect') as HTMLSelectElement;

imageSelect.addEventListener('click', e => {
    updatePreview();
});
imageSelect.addEventListener('change', e => {
    updatePreview();
});

console.log('👋 This message is being logged by "offscreen.js", included via webpack');

const video = document.querySelector('video');
const videoCanvas = document.createElement('canvas');
let stream: MediaStream;


async function createVideo(sourceId: string) {
    if (video) {
        try {
            (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        } catch (e) { /* empty */
        }
    }

    stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            mandatory: {
                cursor: 'never',
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId,
                minWidth: 1280,
                maxWidth: 1280,
                minHeight: 720,
                maxHeight: 720
            }
        }
    });
    video.srcObject = stream
    video.onloadedmetadata = (e) => {
        video.play();
    }
}

async function takeScreenshot() {
    const img = await takeVideoSnapshot();

    const jmp = await Jimp.read(Buffer.from(img.substring('data:image/png;base64,'.length), 'base64'));
    // const jmp = await Jimp.read(img);
    await processScreenshot(jmp)
}

async function takeVideoSnapshot(): Promise<string> {
    if (!video) {
        return null;
    }
    if (!videoCanvas) {
        return null;
    }
    videoCanvas.width = video.videoWidth;
    videoCanvas.height = video.videoHeight;
    const ctx = videoCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);

    return videoCanvas.toDataURL('image/png');
}

ipcRenderer.on('setSource', async (event, sourceId) => {
    console.log("source", sourceId)

    createVideo(sourceId);
});

ipcRenderer.on('takeScreenshot', async (event) => {
    console.log("screenshot");

    takeScreenshot();
})

async function processScreenshot(jmp: Jimp) {
    const resized = await jmp.resize(Coordinates.screen.width, Coordinates.screen.height);
    handleImageContent('resized', resized);
    // mainWindow.webContents.send('imageContent', 'resized', await resized.getBase64Async('image/png'));

    const grayscale = await resized.clone().grayscale();
    handleImageContent('grayscale', grayscale);
    // mainWindow.webContents.send('imageContent', 'grayscale', await grayscale.getBase64Async('image/png'));

    const inverted = await grayscale.clone().invert();
    handleImageContent('inverted', inverted);
    // mainWindow.webContents.send('imageContent', 'inverted', await inverted.getBase64Async('image/png'));

    const contrast = await inverted.clone().contrast(0.1)
    handleImageContent('contrast', contrast);
    // mainWindow.webContents.send('imageContent', 'contrast', await contrast.getBase64Async('image/png'));

    ///////////

    // const alliesListImg = await contrast.clone()
    //     .crop(Coordinates.scoreboard.allies.from[0], Coordinates.scoreboard.allies.from[1],
    //         Coordinates.scoreboard.allies.size[0], Coordinates.scoreboard.allies.size[1]);
    // await processPlayerList('allies', alliesListImg);
    //
    // const enemiesListImg = await contrast.clone()
    //     .crop(Coordinates.scoreboard.enemies.from[0], Coordinates.scoreboard.enemies.from[1],
    //         Coordinates.scoreboard.enemies.size[0], Coordinates.scoreboard.enemies.size[1]);
    // await processPlayerList('enemies', enemiesListImg);

    // await processSelf(contrast.clone(), mainWindow);
}

const canvas = document.getElementById('screenshotCanvas') as HTMLCanvasElement;

function updatePreview() {
    const img = document.getElementById('img-' + imageSelect.value) as HTMLImageElement;
    const jmp = images.get(imageSelect.value);

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    //TODO: toggle
    ctx.strokeStyle = 'blue';
    ctx.strokeRect(Coordinates.scoreboard.allies.from[0], Coordinates.scoreboard.allies.from[1],
        Coordinates.scoreboard.allies.size[0], Coordinates.scoreboard.allies.size[1]);
    ctx.strokeStyle = 'red';
    ctx.strokeRect(Coordinates.scoreboard.enemies.from[0], Coordinates.scoreboard.enemies.from[1],
        Coordinates.scoreboard.enemies.size[0], Coordinates.scoreboard.enemies.size[1]);

    ctx.strokeStyle = 'green';
    ctx.fillStyle = 'white';
    ctx.moveTo(Coordinates.self.name.from[0], Coordinates.self.name.from[1]); // top left
    ctx.lineTo(Coordinates.self.name.from[0] + Coordinates.self.name.size[0], Coordinates.self.name.from[1]); // top right
    ctx.lineTo(Coordinates.self.name.from[0] + Coordinates.self.name.size[0], Coordinates.self.name.from[1] + Coordinates.self.name.size[1] * 0.1); // top right
    ctx.lineTo(Coordinates.self.name.from[0], Coordinates.self.name.from[1] + Coordinates.self.name.size[1] * 0.4); // mid left
    ctx.fill();
    ctx.strokeRect(Coordinates.self.name.from[0], Coordinates.self.name.from[1],
        Coordinates.self.name.size[0], Coordinates.self.name.size[1])
    ocr(canvas, Coordinates.self.name as Rect, 'self-name');
    ctx.strokeRect(Coordinates.self.hero.from[0], Coordinates.self.hero.from[1],
        Coordinates.self.hero.size[0], Coordinates.self.hero.size[1])
    ocr(canvas, jmp, Coordinates.self.hero as Rect, 'self-hero');

    ctx.strokeRect(Coordinates.match.wrapper.from[0], Coordinates.match.wrapper.from[1],
        Coordinates.match.wrapper.size[0], Coordinates.match.wrapper.size[1])
    ocr(canvas, jmp, Coordinates.match.wrapper as Rect, 'match-info');

    ctx.strokeRect(Coordinates.performance.wrapper.from[0], Coordinates.performance.wrapper.from[1],
        Coordinates.performance.wrapper.size[0], Coordinates.performance.wrapper.size[1])
    ocr(canvas, jmp, Coordinates.performance.wrapper as Rect, 'performance');

    ctx.strokeStyle = 'gold';
    ctx.strokeRect(Coordinates.match.time.from[0], Coordinates.match.time.from[1],
        Coordinates.match.time.size[0], Coordinates.match.time.size[1])
    ocr(canvas, jmp, Coordinates.match.time as Rect, 'match-time');


}

const workerPool: Worker[] = [];
let workerIndex = 0;
const workerBusys: Map<string, boolean> = new Map<string, boolean>();

for (let i = 0; i < 10; i++) {
    (async () => {
        const worker = await createWorker({
            logger: m => console.log(m),
        });
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        workerPool[i] = worker;
    })();
}

async function ocr(canvas: HTMLCanvasElement, jmp: Jimp, rect: Rect, id: string) {
    if (workerBusys.get(id)) {
        return;
    }
    workerBusys.set(id, true);
    updateTextDebug(id, "....");

    // const recognized = await Tesseract.recognize(canvas);
    const worker = workerPool[workerIndex++];
    if (workerIndex >= 10) {
        workerIndex = 0;
    }
    let recognized;
    try {
        recognized = await worker.recognize(canvas, {
            rectangle: {
                left: rect.from[0],
                top: rect.from[1],
                width: rect.size[0],
                height: rect.size[1]
            }
        }, {
            text: true,
            pdf: false,
            tsv: false,
            hocr: false,
            blocks: false
        });
    } catch (e) {
        console.log(e)
    }
    workerBusys.set(id, false);
    console.log(recognized);
    console.log(recognized.data.text)
    updateTextDebug(id, recognized.data.text);

    ipcRenderer.send('recognizedText', id, recognized.data.text)

}

function updateTextDebug(id: string, text: string) {
    let element = document.querySelector('.text-debug#' + id);
    if (!element) {
        element = document.createElement('span');
        element.className = 'text-debug';
        element.id = id;
        document.getElementById('textDebug').appendChild(element);
    }
    element.textContent = `[${id}] ${text}`;
}

// ipcRenderer.on('screenshotContent', async (event, sourceId) => {
//     console.log("source",sourceId)
//     document.getElementById('screenshotPreview').src = sourceId
// });

const screenshotStatus = document.getElementById('screenshotStatus');
ipcRenderer.on('takingScreenshot', e => {
    screenshotStatus.textContent = "Taking screenshot";
})

const images = new Map<string, Jimp>();

async function handleImageContent(imageType: string, jimp: Jimp) {
    console.log("handleImageContent", imageType);

    const content = await jimp.getBase64Async('image/png')
    screenshotStatus.textContent = "Got new screenshot";

    images.set(imageType, jimp);

    let element = document.getElementById(`img-${imageType}`) as HTMLImageElement;
    if (!element) {
        element = document.createElement('img') as HTMLImageElement;
        element.className = 'image-content';
        element.id = `img-${imageType}`;
        element.style.display = 'none';
        document.body.appendChild(element);

        imageTypes.add(imageType);
        const select = (document.getElementById('imageSelect') as HTMLSelectElement);
        const option = document.createElement('option') as HTMLOptionElement;
        option.value = imageType;
        option.text = imageType;
        select.appendChild(option);
    }
    element.src = content;

    // wait for new image content to load before re-drawing
    setTimeout(() => {
        updatePreview();
    }, 200);
}

