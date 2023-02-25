import {GameData} from "../types";
import * as fs from "fs";
import Jimp from "jimp";


export class Output {

    write(data: GameData): void {
    }

    writeImage(data: GameData, jmp: Jimp, canvas: string): void {
    }

}

export class JsonOutput extends Output {

    write(data: GameData) {
        console.log(data)
        const name = data.times.start.toISOString().replace(/:/g, '-') + "-" + data.status;
        const out = `./output/games/game-${name}.json`;
        console.log(out);
        JsonOutput.writeJson(`./output/games/game-${name}.json`, data);
    }

    writeImage(data: GameData, jmp: Jimp, canvas: string) {
        const name = data.status + "-" + data.times.start.toISOString().replace(/:/g, '-');
        const out1 = `./output/games/game-${name}.original.png`;
        console.log(out1);
        jmp.write(out1);
        const out2 = `./output/games/game-${name}.labelled.png`;
        console.log(out2)
        fs.writeFileSync(out2, Buffer.from(canvas.substring('data:image/png;base64,'.length), 'base64'))
    }

    static readJson(file: string): GameData {
        const str = fs.readFileSync(file, 'utf-8');
        return JSON.parse(str) as GameData;
    }

    static writeJson(file: string, data: GameData) {
        try {
            fs.writeFileSync(file, JSON.stringify(data, null, 2), {
                encoding: 'utf-8',
                flag: 'w'
            });
        } catch (e) {
            console.log(e)
        }
    }

}
