import {createWorker, PSM, RecognizeOptions, Worker, WorkerParams} from "tesseract.js";
import {JobQueue} from "jobqu";
import {OcrRequest, OcrResult, Rect} from "./types";
import Jimp from "jimp";

export const MIN_CONFIDENCE = 60;

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

export async function ocr0(canvas: HTMLCanvasElement, jmp: Jimp, x: number, y: number, w: number, h: number, id: string) {
    return ocr(canvas, jmp, {from: [x, y], size: [w, h]}, id);
}

export async function ocr1(request: OcrRequest): Promise<OcrResult> {
    return ocr(null, request.jmp, request.rect, request.id);
}


export async function ocr(canvas: HTMLCanvasElement, jmp: Jimp, rect: Rect, id: string, mode = 'default'): Promise<OcrResult> {
    updateTextDebug(id, "....", 0, true);
    return ocrQueue.add({
        jmp,
        rect,
        id,
        mode
    })
}

export async function _ocr1(request: OcrRequest): Promise<OcrResult> {
    return _ocr(null, request.jmp, request.rect, request.id, request.mode);
}

export async function _ocr(canvas: HTMLCanvasElement, jmp: Jimp, rect: Rect, id: string, mode = 'default'): Promise<OcrResult> {
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
