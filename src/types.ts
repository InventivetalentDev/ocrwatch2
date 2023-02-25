import Jimp from "jimp";

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
    jmp: Jimp;
}

export interface OcrResult {
    text: string;
    confidence: number;
}

export interface PlayerData {
    primary: string
    secondary: string
    eliminations: number
    assists: number
    deaths: number
    damage: number
    healing: number
    mitigated: number
}

export interface GameData {
    times: {
        start: Date,
        end: Date
    },
    status: 'in_progress' | 'win' | 'draw' | 'loss'|'reset'
    self: {
        name: string,
        hero: string,
        heroes: string[]
    },
    match: {
        info: string,
        mode: string,
        map: string,
        competitive: boolean,
        time: {
            text: string,
            duration: number
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
