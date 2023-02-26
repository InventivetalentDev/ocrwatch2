import {GameData} from "../types";
import * as fs from "fs";
import Jimp from "jimp";


export class Output {

    writeGame(data: GameData): void {
    }

    writeImage(data: GameData, jmp: Jimp, canvas: string): void {
    }

}

export class JsonOutput extends Output {

    writeGame(data: GameData) {
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

    static readJson<T>(file: string): T {
        const str = fs.readFileSync(file, 'utf-8');
        return JSON.parse(str) as T;
    }

    static writeJson(file: string, data: any) {
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

export class RowOutput extends Output {

    getHeader() {
        return [
            "time",
            "status",
            "account",
            "hero",
            "mode",
            "map",
            "competitive",
            "duration"
        ];
    }

    makeRow(data: GameData): (string | number | boolean)[] {
        return [
            data.times.start.toISOString(),
            data.status,
            data.self.name,
            data.self.heroes.join('+'),
            data.match.mode,
            data.match.map,
            data.match.competitive,
            data.match.time.duration
        ];
    }

    writeRow(out: string, row: string) {
        fs.writeFileSync(out, row + '\n', {
            encoding: 'utf-8',
            flag: 'a'
        })
    }

}

export class TSVOutput extends RowOutput {

    writeGame(data: GameData) {
        const row = this.makeRow(data).join("\t");
        const out = "./output/games.tsv";
        if (!fs.existsSync(out)) {
            this.writeRow(out, this.getHeader().join('\t'))
        }
        this.writeRow(out, row);
    }

}

export class CSVOutput extends RowOutput {

    writeGame(data: GameData) {
        const row = this.makeRow(data).join(",");
        const out = "./output/games.csv";
        if (!fs.existsSync(out)) {
            this.writeRow(out, this.getHeader().join(','))
        }
        this.writeRow(out, row);
    }

}
