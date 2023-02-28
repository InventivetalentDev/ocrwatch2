import Jimp from "jimp";
import cv from "@techstark/opencv-js";

export interface Rect {
    from: [number, number];
    size: [number, number];

    [key: string]: any | Rect;
}

export interface Offset {
    x: number;
    w: number;
}

export interface OcrRequest {
    id: string;
    rect: Rect | null;
    jmp: Jimp|cv.Mat;
    mode: string;
}

export interface OcrResult {
    text: string;
    confidence: number;
}

export interface PlayerData {
    primary: string
    secondary: string
    roleColor: { r: number; g: number; b: number; }
    role: string;
    grouped: boolean;
    name: string;
    eliminations: number
    assists: number
    deaths: number
    damage: number
    healing: number
    mitigated: number
}

export interface SelfStat {
    text: string
    title: string
    value: number
    unit: string;
}

export interface GameData {
    times: {
        start: Date,
        end: Date
    },
    status: 'in_progress' | 'win' | 'draw' | 'loss' | 'reset'
    self: {
        name: string,
        hero: string,
        heroes: string[],
        stats: SelfStat[]
    },
    match: {
        info: string,
        mode: string,
        map: string,
        competitive: boolean,
        time: {
            text: string,
            duration: number
        },
        status: {
            type: string,
            text: string,
            lines: string[],
            state: string,
            allies: {
                time: '',
                distance: ''
            },
            enemies: {
                time: '',
                distance: ''
            }
        }
    },
    performance: any,
    allies: PlayerData[],
    enemies: PlayerData[],
    sums: {
        allies: PlayerData,
        enemies: PlayerData
    }
}



export interface Session {
    states: string[]
    rank: string
}

export interface GlobalSession extends Session {
    lastAccount: string
    accounts: {[key: string]: Session}
}
