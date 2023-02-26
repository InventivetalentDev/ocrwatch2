import './index.css';

import {ipcRenderer} from 'electron';
import {Coordinates} from "./coordinates";
import {createWorker, PSM, RecognizeOptions, Worker, WorkerParams} from "tesseract.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Jimp from "jimp/es";
import {GameData, OcrRequest, OcrResult, PlayerData, Rect} from "./types";
import {JobQueue} from "jobqu";
import {CSVOutput, JsonOutput, TSVOutput} from "./output/output";
import deepmerge from "deepmerge";

console.log('👋 This message is being logged by "renderer.js", included via webpack');

const MIN_CONFIDENCE = 70

setTimeout(() => {
    ipcRenderer.send('initVideo');
}, 1000);
// setTimeout(() => {
//     takeScreenshot()
// }, 1200);

// setInterval(() => {
//     takeScreenshot();
// }, 5000);

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

const DEFAULT_PLAYER: PlayerData = {
    primary: '',
    secondary: '',
    eliminations: 0,
    assists: 0,
    deaths: 0,
    damage: 0,
    healing: 0,
    mitigated: 0
};
const DEFAULT_DATA: GameData = {
    times: {
        start: new Date(),
        end: new Date()
    },
    status: 'in_progress',
    self: {
        name: '',
        hero: '',
        heroes: [],
        stats: []
    },
    match: {
        info: '',
        mode: '',
        map: '',
        competitive: false,
        time: {
            text: '0:00',
            duration: 0
        }
    },
    performance: {},
    allies: [],
    enemies: [],
    sums: {
        allies: deepmerge({}, DEFAULT_PLAYER),
        enemies: deepmerge({}, DEFAULT_PLAYER)
    }
};

for (let i = 0; i < 5; i++) {
    DEFAULT_DATA.allies.push(deepmerge({}, DEFAULT_PLAYER));
    DEFAULT_DATA.enemies.push(deepmerge({}, DEFAULT_PLAYER));
}

const RANKS = [];
const RANK_NAMES = ["bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster"];
for (let name of RANK_NAMES) {
    for (let i = 1; i <= 5; i++) {
        RANKS.push(name + "" + i);
    }
}

let data = deepmerge({}, DEFAULT_DATA);


try {
    data = JsonOutput.readJson("currentgame.json")
    data.times.start = new Date(data.times.start);
    data.times.end = new Date(data.times.end);
    if (data.status !== 'in_progress') {
        resetData();
    }
    updateDataDebug();
} catch (e) {
    console.log(e)
}

function resetData() {
    console.log("reset!")
    data = deepmerge({}, DEFAULT_DATA);
    data.times.start = new Date();
    data.times.end = new Date();
}

const outputs = [
    new JsonOutput(),
    new TSVOutput(),
    new CSVOutput()
]

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
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
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
    video.onloadedmetadata = () => {
        video.play();
    }
}

async function takeScreenshot() {
    screenshotStatus.textContent = "Taking screenshot...";

    const img = await takeVideoSnapshot();

    screenshotStatus.textContent = "Processing...";
    canvas.classList.add('processing');

    let jmp;
    if ((document.getElementById('testImg') as HTMLInputElement).checked) {
        jmp = await Jimp.read("https://i.imgur.com/SQeVL8V.png")
    } else {
        jmp = await Jimp.read(Buffer.from(img.substring('data:image/png;base64,'.length), 'base64'));
    }

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

    const grayscale = await resized.clone()
        .grayscale();
    handleImageContent('grayscale', grayscale);
    // mainWindow.webContents.send('imageContent', 'grayscale', await grayscale.getBase64Async('image/png'));

    const inverted = await grayscale.clone().invert();
    handleImageContent('inverted', inverted);
    // mainWindow.webContents.send('imageContent', 'inverted', await inverted.getBase64Async('image/png'));

    const contrast = await inverted.clone().contrast(0.1)
    handleImageContent('contrast', contrast);

    const threshold = await contrast.clone().threshold({max: 180, autoGreyscale: false})
    handleImageContent('threshold', threshold);
    // mainWindow.webContents.send('imageContent', 'contrast', await contrast.getBase64Async('image/png'));

    const maskJmp = await Jimp.read("https://i.imgur.com/uzNlsBC.png");
    const masked = await contrast.clone().blit(maskJmp, 0, 0);
    handleImageContent('masked', masked);

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
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    document.getElementById('positionInfo').textContent = `${Math.round(x)} ${Math.round(y)}`
})

function cleanupText(txt: string) {
    return txt.replace('\n', '').trim();
}

function parseNumber(txt: string): number {
    if (!txt) return 0;
    txt = txt.replace(',', '');
    txt = txt.replace('.', '');
    txt = txt.replace('o', '0');
    txt = txt.replace('O', '0');
    let parsed = parseInt(txt.trim());
    if (isNaN(parsed)) {
        parsed = 0;
    }
    return parsed;
}

let ocrRunning = false

function updatePreview() {
    if (ocrRunning) {
        return;
    }
    ocrRunning = true;

    const img = document.getElementById('img-' + imageSelect.value) as HTMLImageElement;
    const jmp = images.get(imageSelect.value);
    const resized = images.get('resized');
    const contrast = images.get('contrast');

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    screenshotStatus.textContent = "Running OCR...";
    canvas.classList.add('ocring');


    const drawOutlines = true;
    const drawLabels = true;

    ctx.textBaseline = "top";
    ctx.font = "bold 18px Consolas"

    const WHITE = 'rgba(255,255,255,0.9)';
    const GREEN = 'rgba(62,255,62,0.9)';
    const RED = 'rgba(255,36,36,0.9)';

    function drawLabel(label: string, rect: Rect, textStyle = WHITE) {
        const x = rect.from[0];
        const y = rect.from[1];

        const metrics = ctx.measureText(label);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(rect.from[0] + rect.size[0] - metrics.width - 6, y, metrics.width + 6, metrics.actualBoundingBoxDescent + 6);
        ctx.fillStyle = textStyle;
        ctx.fillText(label, rect.from[0] + rect.size[0] - metrics.width - 2, y + 2);
    }

    const ocrPromises: Promise<void | OcrResult>[] = [];

    {
        if (drawOutlines) {
            ctx.strokeStyle = 'green';
            // ctx.fillStyle = 'white';
            // ctx.moveTo(Coordinates.self.name.from[0], Coordinates.self.name.from[1]); // top left
            // ctx.lineTo(Coordinates.self.name.from[0] + Coordinates.self.name.size[0], Coordinates.self.name.from[1]); // top right
            // ctx.lineTo(Coordinates.self.name.from[0] + Coordinates.self.name.size[0], Coordinates.self.name.from[1] + Coordinates.self.name.size[1] * 0.1); // top right
            // ctx.lineTo(Coordinates.self.name.from[0], Coordinates.self.name.from[1] + Coordinates.self.name.size[1] * 0.4); // mid left
            // ctx.fill();
            ctx.strokeRect(Coordinates.self.name.from[0], Coordinates.self.name.from[1],
                Coordinates.self.name.size[0], Coordinates.self.name.size[1])
        }
        const nameplate = jmp.clone()
            .crop(Coordinates.self.name.from[0], Coordinates.self.name.from[1], Coordinates.self.name.size[0], Coordinates.self.name.size[1])
            .rotate(-4.5)
            .crop(0, 19, 200, 25)
            .threshold({max: 220, autoGreyscale: false});
        debugImage('nameplate', nameplate);
        ocrPromises.push(ocr(canvas, nameplate, null, 'self-name')
            .then(res => {
                if (res.confidence > MIN_CONFIDENCE) {
                    data.self.name = cleanupText(res.text)
                }
                if (drawLabels) {
                    drawLabel(data.self.name, Coordinates.self.name);
                }
            }))
    }

    const heroName = jmp.clone()
        .crop(Coordinates.self.hero.from[0], Coordinates.self.hero.from[1], Coordinates.self.hero.size[0], Coordinates.self.hero.size[1])
        .contrast(0.1)
        .scale(0.5)
        .threshold({max: 175, autoGreyscale: false});
    debugImage('heroName', heroName);
    if (drawOutlines) {
        ctx.strokeRect(Coordinates.self.hero.from[0], Coordinates.self.hero.from[1],
            Coordinates.self.hero.size[0], Coordinates.self.hero.size[1])
    }
    ocrPromises.push(ocr(canvas, heroName, null, 'self-hero', 'chars')
        .then(res => {
            if (res.confidence > MIN_CONFIDENCE) {
                data.self.hero = cleanupText(res.text)
                if (data.self.heroes.indexOf(data.self.hero) < 0) {
                    data.self.heroes.push(data.self.hero);
                }
            }
            if (drawLabels) {
                drawLabel(data.self.hero, Coordinates.self.hero)
            }
        }))

    {
        for (let i = 0; i < 7; i++) {
            if (drawOutlines) {
                ctx.strokeRect(Coordinates.self.stats.from[0], Coordinates.self.stats.from[1] + Coordinates.self.stats.height * i,
                    Coordinates.self.stats.size[0], Coordinates.self.stats.height)
            }
            if (i >= data.self.stats.length - 1) {
                data.self.stats.push({});
            }
            ocrPromises.push(ocr0(canvas, jmp, Coordinates.self.stats.from[0], Coordinates.self.stats.from[1] + Coordinates.self.stats.height * i,
                Coordinates.self.stats.size[0], Coordinates.self.stats.height, 'self-stats-' + i)
                .then(res => {
                    if (res.confidence > MIN_CONFIDENCE) {
                        try {
                            data.self.stats[i].text = res.text;
                            const split = res.text.split(/([\do]+)([%]?)(.*)/);
                            console.log(split);
                            data.self.stats[i].value = parseNumber(split[1]);
                            data.self.stats[i].unit = split[2];
                            data.self.stats[i].title = cleanupText(split[split.length - 1].replace(',', '').replace('.', ''));
                        } catch (e) {
                            console.log(e);
                        }
                    }
                    if (drawLabels && data.self.stats[i]) {
                        drawLabel(`${data.self.stats[i].value} ${data.self.stats[i].title}`, {
                            from: [Coordinates.self.stats.from[0], Coordinates.self.stats.from[1] + Coordinates.self.stats.height * i],
                            size: [Coordinates.self.stats.size[0], Coordinates.self.stats.height]
                        })
                    }
                }))
        }
    }

    if (drawOutlines) {
        ctx.strokeRect(Coordinates.match.wrapper.from[0], Coordinates.match.wrapper.from[1],
            Coordinates.match.wrapper.size[0], Coordinates.match.wrapper.size[1])
    }
    ocrPromises.push(ocr(canvas, jmp, Coordinates.match.wrapper as Rect, 'match-info')
        .then(res => {
            if (res.confidence > MIN_CONFIDENCE) {
                try {
                    const prevMap = data.match.map;

                    data.match.info = cleanupText(res.text);
                    const mapSplit = data.match.info.split("|");
                    const modeSplit = mapSplit[0].split("-");
                    data.match.mode = cleanupText(modeSplit[0]);
                    data.match.map = cleanupText(mapSplit[1]);
                    data.match.competitive = mapSplit[0].toUpperCase().includes("COMPETITIVE");

                    if (prevMap && prevMap.length > 0 && data.match.map != prevMap) {
                        resetData();
                    }
                } catch (e) {
                    console.log(e);
                }
            }
            if (drawLabels) {
                drawLabel(data.match.mode + " " + (data.match.competitive ? "(COMP)" : "") + " " + data.match.map, Coordinates.match.wrapper);
            }
        }))

    if (drawOutlines) {
        ctx.strokeRect(Coordinates.performance.wrapper.from[0], Coordinates.performance.wrapper.from[1],
            Coordinates.performance.wrapper.size[0], Coordinates.performance.wrapper.size[1])
    }
    ocrPromises.push(ocr(canvas, jmp, Coordinates.performance.wrapper as Rect, 'performance')
        .then(res => {
            if (res.confidence > MIN_CONFIDENCE) {
                data.performance.text = cleanupText(res.text);
            }
        }))

    if (drawOutlines) {
        ctx.strokeStyle = 'gold';
        ctx.strokeRect(Coordinates.match.time.from[0], Coordinates.match.time.from[1],
            Coordinates.match.time.size[0], Coordinates.match.time.size[1])
    }
    ocrPromises.push(ocr(canvas, jmp, Coordinates.match.time as Rect, 'match-time')
        .then(res => {
            if (res.confidence > MIN_CONFIDENCE) {
                try {
                    data.match.time.text = cleanupText(res.text);
                    const split = data.match.time.text.split(':');
                    let time = 0;
                    time += parseNumber(split[0]) * 60;
                    time += parseNumber(split[1]);

                    const prevDuration = data.match.time.duration;
                    data.match.time.duration = time;

                    if (data.match.time.duration > prevDuration) {
                        // resetData();
                    }
                } catch (e) {
                    console.log(e)
                }
            }
            if (drawLabels) {
                drawLabel(data.match.time.text, Coordinates.match.time);
            }
        }))

    document.getElementById('imgDebug').append(document.createElement('br'));


    {
        if (drawOutlines) {
            ctx.strokeStyle = 'blue';
            ctx.strokeRect(Coordinates.scoreboard.allies.from[0], Coordinates.scoreboard.allies.from[1],
                Coordinates.scoreboard.allies.size[0], Coordinates.scoreboard.allies.size[1]);
        }
        for (let i = 0; i < 5; i++) {
            if (drawOutlines) {
                ctx.strokeStyle = 'blue';
                ctx.beginPath();
                ctx.moveTo(Coordinates.scoreboard.allies.from[0], Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.rowHeight * i)
                ctx.lineTo(Coordinates.scoreboard.allies.from[0] + Coordinates.scoreboard.allies.size[0], Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.rowHeight * i)
                ctx.stroke()
            }

            const stats1 = resized.clone().crop(Coordinates.scoreboard.allies.stats1.from[0], Coordinates.scoreboard.allies.stats1.from[1] + Coordinates.scoreboard.rowHeight * i,
                Coordinates.scoreboard.allies.stats1.size[0], Coordinates.scoreboard.rowHeight)
                // .color([
                //     {apply: "xor", params: ["#127A93"]}
                // ])
                .invert()
                .threshold({max: 200})
            const stats2 = resized.clone().crop(Coordinates.scoreboard.allies.stats2.from[0], Coordinates.scoreboard.allies.stats2.from[1] + Coordinates.scoreboard.rowHeight * i,
                Coordinates.scoreboard.allies.stats2.size[0], Coordinates.scoreboard.rowHeight)
                // .color([
                //     {apply: "xor", params: ["#127A93"]}
                // ])
                .invert()
                .threshold({max: 200})
            debugImage('allies-' + i + '-primary', stats1);
            debugImage('allies-' + i + '-secondary', stats2);
            ocrPromises.push(ocr(canvas, stats1, null, 'allies-' + i + '-primary').then(res => {
                if (res.confidence > MIN_CONFIDENCE) {
                    data.allies[i].primary = cleanupText(res.text)
                    const split = data.allies[i].primary.split(' ');
                    data.allies[i].eliminations = Math.max(parseNumber(split[0]), data.allies[i].eliminations);
                    data.allies[i].assists = Math.max(parseNumber(split[1]), data.allies[i].assists);
                    data.allies[i].deaths = Math.max(parseNumber(split[2]), data.allies[i].deaths);
                }

                drawLabel(`${data.allies[i].eliminations}`, {
                    from: [Coordinates.scoreboard.allies.from[0] + Coordinates.scoreboard.offsets.elims.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.rowHeight * i],
                    size: [Coordinates.scoreboard.offsets.elims.w, Coordinates.scoreboard.rowHeight]
                });
                drawLabel(`${data.allies[i].assists}`, {
                    from: [Coordinates.scoreboard.allies.from[0] + Coordinates.scoreboard.offsets.assists.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.rowHeight * i],
                    size: [Coordinates.scoreboard.offsets.assists.w, Coordinates.scoreboard.rowHeight]
                });
                drawLabel(`${data.allies[i].deaths}`, {
                    from: [Coordinates.scoreboard.allies.from[0] + Coordinates.scoreboard.offsets.deaths.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.rowHeight * i],
                    size: [Coordinates.scoreboard.offsets.deaths.w, Coordinates.scoreboard.rowHeight]
                })
            }))
            ocrPromises.push(ocr(canvas, stats2, null, 'allies-' + i + '-secondary').then(res => {
                if (res.confidence > MIN_CONFIDENCE) {
                    data.allies[i].secondary = cleanupText(res.text)
                    const split = data.allies[i].secondary.split(' ');
                    data.allies[i].damage = Math.max(parseNumber(split[0]), data.allies[i].damage);
                    data.allies[i].healing = Math.max(parseNumber(split[1]), data.allies[i].healing);
                    data.allies[i].mitigated = Math.max(parseNumber(split[2]), data.allies[i].mitigated);
                }

                drawLabel(`${data.allies[i].damage}`, {
                    from: [Coordinates.scoreboard.allies.from[0] + Coordinates.scoreboard.offsets.damage.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.rowHeight * i],
                    size: [Coordinates.scoreboard.offsets.damage.w, Coordinates.scoreboard.rowHeight]
                });
                drawLabel(`${data.allies[i].healing}`, {
                    from: [Coordinates.scoreboard.allies.from[0] + Coordinates.scoreboard.offsets.healing.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.rowHeight * i],
                    size: [Coordinates.scoreboard.offsets.healing.w, Coordinates.scoreboard.rowHeight]
                });
                drawLabel(`${data.allies[i].mitigated}`, {
                    from: [Coordinates.scoreboard.allies.from[0] + Coordinates.scoreboard.offsets.mitigated.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.rowHeight * i],
                    size: [Coordinates.scoreboard.offsets.mitigated.w, Coordinates.scoreboard.rowHeight]
                })
            }))

            document.getElementById('imgDebug').append(document.createElement('br'));
            // for (const offset in Coordinates.scoreboard.offsets) {
            //     if ('nameEnemy' === offset) continue;
            //     const offs = Coordinates.scoreboard.offsets[offset] as Offset;
            //     if ('nameAlly' === offset) {
            //         const nameplate = jmp.clone()
            //             .crop(Coordinates.scoreboard.allies.from[0] + offs.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.rowHeight * i,
            //                 offs.w, Coordinates.scoreboard.rowHeight)
            //             .scale(0.9)
            //             .threshold({max: 180, autoGreyscale: false});
            //         debugImage('ally-' + i, nameplate);
            //         ocr(canvas, nameplate, null, 'allies-' + i + '-' + offset);
            //         continue
            //     }
            //     ocr0(canvas, jmp, Coordinates.scoreboard.allies.from[0] + offs.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.rowHeight * i,
            //         offs.w, Coordinates.scoreboard.rowHeight, 'allies-' + i + '-' + offset);
            // }
        }

        if (drawOutlines) {
            ctx.strokeStyle = 'red';
            ctx.strokeRect(Coordinates.scoreboard.enemies.from[0], Coordinates.scoreboard.enemies.from[1],
                Coordinates.scoreboard.enemies.size[0], Coordinates.scoreboard.enemies.size[1]);
        }
        for (let i = 0; i < 5; i++) {
            if (drawOutlines) {
                ctx.strokeStyle = 'red';
                ctx.beginPath();
                ctx.moveTo(Coordinates.scoreboard.enemies.from[0], Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.rowHeight * i)
                ctx.lineTo(Coordinates.scoreboard.enemies.from[0] + Coordinates.scoreboard.enemies.size[0], Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.rowHeight * i)
                ctx.stroke()
            }

            const stats1 = resized.clone().crop(Coordinates.scoreboard.enemies.stats1.from[0], Coordinates.scoreboard.enemies.stats1.from[1] + Coordinates.scoreboard.rowHeight * i,
                Coordinates.scoreboard.enemies.stats1.size[0], Coordinates.scoreboard.rowHeight)
                // .color([
                //     {apply: "xor", params: ["#127A93"]}
                // ])
                .invert()
                .threshold({max: 220})
            const stats2 = resized.clone().crop(Coordinates.scoreboard.enemies.stats2.from[0], Coordinates.scoreboard.enemies.stats2.from[1] + Coordinates.scoreboard.rowHeight * i,
                Coordinates.scoreboard.enemies.stats2.size[0], Coordinates.scoreboard.rowHeight)
                // .color([
                //     {apply: "xor", params: ["#127A93"]}
                // ])
                .invert()
                .threshold({max: 220})
            debugImage('enemies-' + i + '-primary', stats1);
            debugImage('enemies-' + i + '-secondary', stats2);
            ocrPromises.push(ocr(canvas, stats1, null, 'enemies-' + i + '-primary').then(res => {
                if (res.confidence > MIN_CONFIDENCE) {
                    data.enemies[i].primary = cleanupText(res.text)
                    const split = data.enemies[i].primary.split(' ');
                    data.enemies[i].eliminations = Math.max(parseNumber(split[0]), data.enemies[i].eliminations);
                    data.enemies[i].assists = Math.max(parseNumber(split[1]), data.enemies[i].assists);
                    data.enemies[i].deaths = Math.max(parseNumber(split[2]), data.enemies[i].deaths);
                }
                drawLabel(`${data.enemies[i].eliminations}`, {
                    from: [Coordinates.scoreboard.enemies.from[0] + Coordinates.scoreboard.offsets.elims.x, Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.rowHeight * i],
                    size: [Coordinates.scoreboard.offsets.elims.w, Coordinates.scoreboard.rowHeight]
                });
                drawLabel(`${data.enemies[i].assists}`, {
                    from: [Coordinates.scoreboard.enemies.from[0] + Coordinates.scoreboard.offsets.assists.x, Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.rowHeight * i],
                    size: [Coordinates.scoreboard.offsets.assists.w, Coordinates.scoreboard.rowHeight]
                });
                drawLabel(`${data.enemies[i].deaths}`, {
                    from: [Coordinates.scoreboard.enemies.from[0] + Coordinates.scoreboard.offsets.deaths.x, Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.rowHeight * i],
                    size: [Coordinates.scoreboard.offsets.deaths.w, Coordinates.scoreboard.rowHeight]
                })
            }))
            ocrPromises.push(ocr(canvas, stats2, null, 'enemies-' + i + '-secondary').then(res => {
                if (res.confidence > MIN_CONFIDENCE) {
                    data.enemies[i].secondary = cleanupText(res.text)
                    const split = data.enemies[i].secondary.split(' ');
                    data.enemies[i].damage = Math.max(parseNumber(split[0]), data.enemies[i].damage);
                    data.enemies[i].healing = Math.max(parseNumber(split[1]), data.enemies[i].healing);
                    data.enemies[i].mitigated = Math.max(parseNumber(split[2]), data.enemies[i].mitigated);
                }
                drawLabel(`${data.enemies[i].damage}`, {
                    from: [Coordinates.scoreboard.enemies.from[0] + Coordinates.scoreboard.offsets.damage.x, Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.rowHeight * i],
                    size: [Coordinates.scoreboard.offsets.damage.w, Coordinates.scoreboard.rowHeight]
                });
                drawLabel(`${data.enemies[i].healing}`, {
                    from: [Coordinates.scoreboard.enemies.from[0] + Coordinates.scoreboard.offsets.healing.x, Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.rowHeight * i],
                    size: [Coordinates.scoreboard.offsets.healing.w, Coordinates.scoreboard.rowHeight]
                });
                drawLabel(`${data.enemies[i].mitigated}`, {
                    from: [Coordinates.scoreboard.enemies.from[0] + Coordinates.scoreboard.offsets.mitigated.x, Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.rowHeight * i],
                    size: [Coordinates.scoreboard.offsets.mitigated.w, Coordinates.scoreboard.rowHeight]
                })
            }))

            document.getElementById('imgDebug').append(document.createElement('br'));
            // ocr0(canvas, jmp, Coordinates.scoreboard.enemies.from[0], Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.rowHeight * i,
            //     Coordinates.scoreboard.enemies.size[0], Coordinates.scoreboard.rowHeight, 'enemies-' + i);
            // for (const offset in Coordinates.scoreboard.offsets) {
            //     if ('nameAlly' === offset) continue;
            //     const offs = Coordinates.scoreboard.offsets[offset] as Offset;
            //     ocr0(canvas, jmp, Coordinates.scoreboard.enemies.from[0] + offs.x, Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.rowHeight * i,
            //         offs.w, Coordinates.scoreboard.rowHeight, 'enemies-' + i + '-' + offset);
            // }
        }
    }

    setTimeout(() => {
        updateDataDebug();
    }, 1000);
    Promise.all(ocrPromises)
        .then(() => {
            data.sums.allies.eliminations = data.allies.map(p => p.eliminations).reduce((a, b) => a + b, 0);
            data.sums.allies.assists = data.allies.map(p => p.assists).reduce((a, b) => a + b, 0);
            data.sums.allies.deaths = data.allies.map(p => p.deaths).reduce((a, b) => a + b, 0);
            data.sums.allies.damage = data.allies.map(p => p.damage).reduce((a, b) => a + b, 0);
            data.sums.allies.healing = data.allies.map(p => p.healing).reduce((a, b) => a + b, 0);
            data.sums.allies.mitigated = data.allies.map(p => p.mitigated).reduce((a, b) => a + b, 0);

            data.sums.enemies.eliminations = data.enemies.map(p => p.eliminations).reduce((a, b) => a + b, 0);
            data.sums.enemies.assists = data.enemies.map(p => p.assists).reduce((a, b) => a + b, 0);
            data.sums.enemies.deaths = data.enemies.map(p => p.deaths).reduce((a, b) => a + b, 0);
            data.sums.enemies.damage = data.enemies.map(p => p.damage).reduce((a, b) => a + b, 0);
            data.sums.enemies.healing = data.enemies.map(p => p.healing).reduce((a, b) => a + b, 0);
            data.sums.enemies.mitigated = data.enemies.map(p => p.mitigated).reduce((a, b) => a + b, 0);

            drawLabel(`${data.sums.allies.eliminations}`, {
                from: [Coordinates.scoreboard.allies.from[0] + Coordinates.scoreboard.offsets.elims.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.allies.size[1] + 10],
                size: [Coordinates.scoreboard.offsets.elims.w, Coordinates.scoreboard.rowHeight]
            }, data.sums.allies.eliminations > data.sums.enemies.eliminations ? GREEN : RED)
            drawLabel(`${data.sums.allies.assists}`, {
                from: [Coordinates.scoreboard.allies.from[0] + Coordinates.scoreboard.offsets.assists.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.allies.size[1] + 10],
                size: [Coordinates.scoreboard.offsets.assists.w, Coordinates.scoreboard.rowHeight]
            }, data.sums.allies.assists > data.sums.enemies.assists ? GREEN : RED)
            drawLabel(`${data.sums.allies.deaths}`, {
                from: [Coordinates.scoreboard.allies.from[0] + Coordinates.scoreboard.offsets.deaths.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.allies.size[1] + 10],
                size: [Coordinates.scoreboard.offsets.deaths.w, Coordinates.scoreboard.rowHeight]
            }, data.sums.allies.deaths < data.sums.enemies.deaths ? GREEN : RED)
            drawLabel(`${data.sums.allies.damage}`, {
                from: [Coordinates.scoreboard.allies.from[0] + Coordinates.scoreboard.offsets.damage.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.allies.size[1] + 10],
                size: [Coordinates.scoreboard.offsets.damage.w, Coordinates.scoreboard.rowHeight]
            }, data.sums.allies.damage > data.sums.enemies.damage ? GREEN : RED)
            drawLabel(`${data.sums.allies.healing}`, {
                from: [Coordinates.scoreboard.allies.from[0] + Coordinates.scoreboard.offsets.healing.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.allies.size[1] + 10],
                size: [Coordinates.scoreboard.offsets.healing.w, Coordinates.scoreboard.rowHeight]
            }, data.sums.allies.healing > data.sums.enemies.healing ? GREEN : RED)
            drawLabel(`${data.sums.allies.mitigated}`, {
                from: [Coordinates.scoreboard.allies.from[0] + Coordinates.scoreboard.offsets.mitigated.x, Coordinates.scoreboard.allies.from[1] + Coordinates.scoreboard.allies.size[1] + 10],
                size: [Coordinates.scoreboard.offsets.mitigated.w, Coordinates.scoreboard.rowHeight]
            }, data.sums.allies.mitigated > data.sums.enemies.mitigated ? GREEN : RED)


            drawLabel(`${data.sums.enemies.eliminations}`, {
                from: [Coordinates.scoreboard.enemies.from[0] + Coordinates.scoreboard.offsets.elims.x, Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.enemies.size[1] + 10],
                size: [Coordinates.scoreboard.offsets.elims.w, Coordinates.scoreboard.rowHeight]
            }, data.sums.enemies.eliminations > data.sums.allies.eliminations ? GREEN : RED)
            drawLabel(`${data.sums.enemies.assists}`, {
                from: [Coordinates.scoreboard.enemies.from[0] + Coordinates.scoreboard.offsets.assists.x, Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.enemies.size[1] + 10],
                size: [Coordinates.scoreboard.offsets.assists.w, Coordinates.scoreboard.rowHeight]
            }, data.sums.enemies.assists > data.sums.allies.assists ? GREEN : RED)
            drawLabel(`${data.sums.enemies.deaths}`, {
                from: [Coordinates.scoreboard.enemies.from[0] + Coordinates.scoreboard.offsets.deaths.x, Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.enemies.size[1] + 10],
                size: [Coordinates.scoreboard.offsets.deaths.w, Coordinates.scoreboard.rowHeight]
            }, data.sums.enemies.deaths < data.sums.allies.deaths ? GREEN : RED)
            drawLabel(`${data.sums.enemies.damage}`, {
                from: [Coordinates.scoreboard.enemies.from[0] + Coordinates.scoreboard.offsets.damage.x, Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.enemies.size[1] + 10],
                size: [Coordinates.scoreboard.offsets.damage.w, Coordinates.scoreboard.rowHeight]
            }, data.sums.enemies.damage > data.sums.allies.damage ? GREEN : RED)
            drawLabel(`${data.sums.enemies.healing}`, {
                from: [Coordinates.scoreboard.enemies.from[0] + Coordinates.scoreboard.offsets.healing.x, Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.enemies.size[1] + 10],
                size: [Coordinates.scoreboard.offsets.healing.w, Coordinates.scoreboard.rowHeight]
            }, data.sums.enemies.healing > data.sums.allies.healing ? GREEN : RED)
            drawLabel(`${data.sums.enemies.mitigated}`, {
                from: [Coordinates.scoreboard.enemies.from[0] + Coordinates.scoreboard.offsets.mitigated.x, Coordinates.scoreboard.enemies.from[1] + Coordinates.scoreboard.enemies.size[1] + 10],
                size: [Coordinates.scoreboard.offsets.mitigated.w, Coordinates.scoreboard.rowHeight]
            }, data.sums.enemies.mitigated > data.sums.allies.mitigated ? GREEN : RED)
        })
        .then(() => {

            updateDataDebug();

            screenshotStatus.textContent = "Ready"
            canvas.classList.remove('ocring')

            JsonOutput.writeJson("currentgame.json", data);

            ocrRunning = false
        })

}

function writeOutputAndReset() {
    data.times.end = new Date();
    JsonOutput.writeJson("currentgame.json", data);
    for (const out of outputs) {
        try {
            out.writeGame(data);
        } catch (e) {
            console.log(e);
        }
        try {
            out.writeImage(data, images.get('resized'), canvas.toDataURL('image/png'))
        } catch (e) {
            console.log(e);
        }
    }
    setTimeout(() => {
        updateDataDebug();
    }, 200);
    setTimeout(() => {
        resetData();
    }, 1000)
    setTimeout(() => {
        updateDataDebug();
    }, 1500);
}

function updateDataDebug() {
    document.getElementById('dataDebug').textContent = JSON.stringify(data, null, 2);
}

const winButton = document.getElementById('winButton') as HTMLButtonElement;
const drawButton = document.getElementById('drawButton') as HTMLButtonElement;
const lossButton = document.getElementById('lossButton') as HTMLButtonElement;
const resetButton = document.getElementById('resetButton') as HTMLButtonElement;
winButton.addEventListener('click', () => {
    data.status = 'win';
    writeOutputAndReset();
    winButton.disabled = true;
    setTimeout(() => {
        winButton.disabled = false;
    }, 1000);
})
drawButton.addEventListener('click', () => {
    data.status = 'draw';
    writeOutputAndReset()
    drawButton.disabled = true;
    setTimeout(() => {
        drawButton.disabled = false;
    }, 1000);
})
lossButton.addEventListener('click', () => {
    data.status = 'loss';
    writeOutputAndReset()
    lossButton.disabled = true;
    setTimeout(() => {
        lossButton.disabled = false;
    }, 1000);
})
resetButton.addEventListener('click', () => {
    data.status = 'reset';
    writeOutputAndReset()
    resetButton.disabled = true;
    setTimeout(() => {
        resetButton.disabled = false;
    }, 1000);
})

const workers: { [key: string]: number } = {
    default: 16,
    chars: 2
};
const workerPool: { [type: string]: Worker[] } = {
    default: [],
    chars: []
};
const workerIndex: { [key: string]: number } = {
    default: 0,
    chars: 0
}
const workerBusys: Map<string, boolean> = new Map<string, boolean>();
const ocrQueue: JobQueue<OcrRequest, OcrResult> = new JobQueue<OcrRequest, OcrResult>(request => _ocr1(request), 200, 2)

for (const type of ['default', 'chars']) {
    for (let i = 0; i < workers[type]; i++) {
        (async () => {
            const worker = await createWorker({
                logger: m => console.debug(m),
            });
            workerPool[type][i] = worker;
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            const params: Partial<WorkerParams> = {};
            if (type === 'chars') {
                params.tessedit_pageseg_mode = PSM.SINGLE_CHAR
            }
            await worker.setParameters({});
        })();
    }
}

async function ocr0(canvas: HTMLCanvasElement, jmp: Jimp, x: number, y: number, w: number, h: number, id: string) {
    return ocr(canvas, jmp, {from: [x, y], size: [w, h]}, id);
}

async function ocr1(request: OcrRequest): Promise<OcrResult> {
    return ocr(null, request.jmp, request.rect, request.id);
}


async function ocr(canvas: HTMLCanvasElement, jmp: Jimp, rect: Rect, id: string, mode = 'default'): Promise<OcrResult> {
    updateTextDebug(id, "....", 0, true);
    return ocrQueue.add({
        jmp,
        rect,
        id,
        mode
    })
}

async function _ocr1(request: OcrRequest): Promise<OcrResult> {
    return _ocr(null, request.jmp, request.rect, request.id, request.mode);
}

async function _ocr(canvas: HTMLCanvasElement, jmp: Jimp, rect: Rect, id: string, mode = 'default'): Promise<OcrResult> {
    if (workerBusys.get(id)) {
        return;
    }
    workerBusys.set(id, true);

    // const recognized = await Tesseract.recognize(canvas);
    const worker = workerPool[mode][workerIndex[mode]++];
    if (workerIndex[mode] >= workers[mode]) {
        workerIndex[mode] = 0;
    }
    let recognized;
    try {
        const options: Partial<RecognizeOptions> = {};
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

function updateTextDebug(id: string, text: string, confidence: number, init = false) {
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
    (element.children.item(1) as HTMLElement).style.color = (confidence > MIN_CONFIDENCE ? 'green' : 'red');
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

let tabDown = false;
ipcRenderer.on('tabKey', (event, action) => {
    console.log(`[tab] ${action}`)
    tabDown = action;

    setTimeout(() => {
        if (tabDown) {
            takeScreenshot();
        }
    }, 500);
})

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

        if (imageType === 'masked') {
            option.selected = true;
        }
    }
    element.src = content;

    // wait for new image content to load before re-drawing
    if (imageType === 'masked') {
        canvas.classList.remove('processing');


        setTimeout(() => {
            updatePreview();
        }, 200);
    }
}

