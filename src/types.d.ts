import Jimp from "jimp";

export interface Rect {
    from: [number, number];
    size: [number, number];
}

export interface Offset {
    x: number;
    w: number;
}

export interface OcrRequest {
    id: string;
    rect: Rect|null;
    jmp: Jimp;
}

export interface OcrResult {
    text: string;
    confidence: number;
}
