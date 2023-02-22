import './index.css';

import {desktopCapturer, ipcRenderer} from 'electron';
import {Coordinates} from "./coordinates";
import {createWorker, RecognizeOptions, Worker} from "tesseract.js";
import Jimp from "jimp/es";
import {OcrRequest, OcrResult, Offset, Rect} from "./types";
import {JobQueue} from "jobqu";

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

    // const jmp = await Jimp.read(Buffer.from(img.substring('data:image/png;base64,'.length), 'base64'));
    // const jmp = await Jimp.read(img);
    const jmp = await Jimp.read("https://i.imgur.com/G0G9z2D.png")
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

    const grayscale = await resized.clone().color([
        {apply:"red",params:[20]},
        {apply:"blue",params:[40]},
        {apply:"green",params:[20]},
        {apply:"desaturate",params:[100]}
    ])
    handleImageContent('grayscale', grayscale);
    // mainWindow.webContents.send('imageContent', 'grayscale', await grayscale.getBase64Async('image/png'));

    const inverted = await grayscale.clone().invert();
    handleImageContent('inverted', inverted);
    // mainWindow.webContents.send('imageContent', 'inverted', await inverted.getBase64Async('image/png'));

    const contrast = await inverted.clone().contrast(0.1)
    handleImageContent('contrast', contrast);

    const threshold = await contrast.clone().threshold({max:180,autoGreyscale:false})
    handleImageContent('threshold', threshold);
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
    {
        ctx.strokeStyle = 'blue';
        ctx.strokeRect(Coordinates.scoreboard.allies.from[0], Coordinates.scoreboard.allies.from[1],
            Coordinates.scoreboard.allies.size[0], Coordinates.scoreboard.allies.size[1]);
        for (let i = 0; i < 5; i++) {
            ctx.moveTo(Coordinates.scoreboard.allies.from[0], Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.rowHeight * i)
            ctx.lineTo(Coordinates.scoreboard.allies.from[0] + Coordinates.scoreboard.allies.size[0], Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.rowHeight * i)
            ctx.stroke()

            ocr0(canvas, jmp, Coordinates.scoreboard.allies.from[0], Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.rowHeight * i,
                Coordinates.scoreboard.allies.size[0], Coordinates.scoreboard.rowHeight, 'allies-' + i);
            for (const offset in Coordinates.scoreboard.offsets) {
                if ('nameEnemy' === offset) continue;
                const offs = Coordinates.scoreboard.offsets[offset] as Offset;
                if ('nameAlly' === offset) {
                    const nameplate = jmp.clone()
                        .crop(Coordinates.scoreboard.allies.from[0] + offs.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.rowHeight * i,
                        offs.w, Coordinates.scoreboard.rowHeight)
                        .scale(0.9)
                        .threshold({max: 180, autoGreyscale: false});
                    debugImage('ally-' + i, nameplate);
                    ocr(canvas, nameplate, null, 'allies-' + i + '-' + offset);
                    continue
                }
                ocr0(canvas, jmp, Coordinates.scoreboard.allies.from[0] + offs.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.rowHeight * i,
                    offs.w, Coordinates.scoreboard.rowHeight, 'allies-' + i + '-' + offset);
            }
        }

        ctx.strokeStyle = 'red';
        ctx.strokeRect(Coordinates.scoreboard.enemies.from[0], Coordinates.scoreboard.enemies.from[1],
            Coordinates.scoreboard.enemies.size[0], Coordinates.scoreboard.enemies.size[1]);
        for (let i = 0; i < 5; i++) {
            ctx.moveTo(Coordinates.scoreboard.enemies.from[0], Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.rowHeight * i)
            ctx.lineTo(Coordinates.scoreboard.enemies.from[0] + Coordinates.scoreboard.enemies.size[0], Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.rowHeight * i)
            ctx.stroke()

            ocr0(canvas, jmp, Coordinates.scoreboard.enemies.from[0], Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.rowHeight * i,
                Coordinates.scoreboard.enemies.size[0], Coordinates.scoreboard.rowHeight, 'enemies-' + i);
            for (const offset in Coordinates.scoreboard.offsets) {
                if ('nameAlly' === offset) continue;
                const offs = Coordinates.scoreboard.offsets[offset] as Offset;
                ocr0(canvas, jmp, Coordinates.scoreboard.enemies.from[0] + offs.x, Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.rowHeight * i,
                    offs.w, Coordinates.scoreboard.rowHeight, 'enemies-' + i + '-' + offset);
            }
        }
    }

    {
        ctx.strokeStyle = 'green';
        // ctx.fillStyle = 'white';
        // ctx.moveTo(Coordinates.self.name.from[0], Coordinates.self.name.from[1]); // top left
        // ctx.lineTo(Coordinates.self.name.from[0] + Coordinates.self.name.size[0], Coordinates.self.name.from[1]); // top right
        // ctx.lineTo(Coordinates.self.name.from[0] + Coordinates.self.name.size[0], Coordinates.self.name.from[1] + Coordinates.self.name.size[1] * 0.1); // top right
        // ctx.lineTo(Coordinates.self.name.from[0], Coordinates.self.name.from[1] + Coordinates.self.name.size[1] * 0.4); // mid left
        // ctx.fill();
        ctx.strokeRect(Coordinates.self.name.from[0], Coordinates.self.name.from[1],
            Coordinates.self.name.size[0], Coordinates.self.name.size[1])
        const nameplate = jmp.clone()
            .crop(Coordinates.self.name.from[0], Coordinates.self.name.from[1], Coordinates.self.name.size[0], Coordinates.self.name.size[1])
            .rotate(-4.5)
            .crop(0, 18, 200, 27);
        debugImage('nameplate', nameplate);
        ocr(canvas, nameplate, null, 'self-name');
    }

    const heroName = jmp.clone()
        .crop(Coordinates.self.hero.from[0], Coordinates.self.hero.from[1], Coordinates.self.hero.size[0], Coordinates.self.hero.size[1])
        .contrast(0.1)
        .scale(0.5)
        .threshold({max: 180, autoGreyscale: false});
    debugImage('heroName', heroName);
    ctx.strokeRect(Coordinates.self.hero.from[0], Coordinates.self.hero.from[1],
        Coordinates.self.hero.size[0], Coordinates.self.hero.size[1])
    ocr(canvas, heroName, null, 'self-hero');

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

const workers = 8;
const workerPool: Worker[] = [];
let workerIndex = 0;
const workerBusys: Map<string, boolean> = new Map<string, boolean>();
const ocrQueue: JobQueue<OcrRequest, OcrResult> = new JobQueue<OcrRequest, OcrResult>(request => _ocr1(request), 200, 2)

for (let i = 0; i < workers; i++) {
    (async () => {
        const worker = await createWorker({
            logger: m => console.debug(m),
        });
        workerPool[i] = worker;
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
    })();
}

async function ocr0(canvas: HTMLCanvasElement, jmp: Jimp, x: number, y: number, w: number, h: number, id: string) {
    return ocr(canvas, jmp, {from: [x, y], size: [w, h]}, id);
}

async function ocr1(request: OcrRequest): Promise<OcrResult> {
    return ocr(null, request.jmp, request.rect, request.id);
}


async function ocr(canvas: HTMLCanvasElement, jmp: Jimp, rect: Rect, id: string): Promise<OcrResult> {
    updateTextDebug(id, "....", 0, true);
    return ocrQueue.add({
        jmp: jmp,
        rect: rect,
        id: id
    })
}

async function _ocr1(request: OcrRequest): Promise<OcrResult> {
    return _ocr(null, request.jmp, request.rect, request.id);
}

async function _ocr(canvas: HTMLCanvasElement, jmp: Jimp, rect: Rect, id: string): Promise<OcrResult> {
    if (workerBusys.get(id)) {
        return;
    }
    workerBusys.set(id, true);

    // const recognized = await Tesseract.recognize(canvas);
    const worker = workerPool[workerIndex++];
    if (workerIndex >= workers) {
        workerIndex = 0;
    }
    let recognized;
    try {
        let options: Partial<RecognizeOptions> = {};
        if (rect) {
            options.rectangle = {
                left: rect.from[0],
                top: rect.from[1],
                width: rect.size[0],
                height: rect.size[1]
            }
        }
        recognized = await worker.recognize(await jmp.getBufferAsync('image/png'), options, {
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
    // console.log(recognized);
    // console.log(recognized.data.text)
    let text = recognized.data.text;
    if (recognized.data.confidence < 10) {
        text = "???";
    }
    updateTextDebug(id, text, recognized.data.confidence);

    // ipcRenderer.send('recognizedText', id, recognized.data.text)

    return {
        text: recognized.data.text,
        confidence: recognized.data.confidence
    }
}

function updateTextDebug(id: string, text: string, confidence: number, init: boolean = false) {
    let element = document.querySelector('.text-debug#' + id);
    if (!element) {
        element = document.createElement('tr');
        element.className = 'text-debug';
        element.id = id;
        document.getElementById('textDebug').appendChild(element);
        {
            const left = document.createElement('td');
            left.className = 'left';
            element.appendChild(left);
        }
        {
            const middle = document.createElement('td');
            middle.className = 'middle';
            element.appendChild(middle);
        }
        {
            const right = document.createElement('td');
            right.className = 'right';
            element.appendChild(right);
        }
    }
    if (init) {
        return;
    }
    element.children.item(0).textContent = id;
    element.children.item(1).textContent = `${confidence}`;
    element.children.item(2).textContent = text;
    // element.textContent = `[${id}] ${text}`;
}

async function debugImage(id: string, jmp: Jimp) {
    let element: HTMLImageElement = document.querySelector('.img-debug#' + id);
    if (!element) {
        element = document.createElement('img');
        element.className = 'img-debug';
        element.id = id;
        document.getElementById('imgDebug').appendChild(element);
    }
    element.src = await jmp.getBase64Async('image/png');
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
    // console.log("handleImageContent", imageType);

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

        if (imageType === 'contrast') {
            option.selected = true;
        }
    }
    element.src = content;

    // wait for new image content to load before re-drawing
    setTimeout(() => {
        updatePreview();
    }, 200);
}

