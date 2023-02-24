import {GameData} from "../types";
import * as fs from "fs";
import {mkdirp} from "mkdirp";


export class Output {

    write(data: GameData) {
    }

}

export class JsonOutput extends Output {

    write(data: GameData) {
        const name = data.status + "-" + data.times.start.toISOString().replace(/:/g, '-');
        const out = `./output/games/game-${name}.json`;
        console.log(out);
        JsonOutput.writeJson(`./output/games/game-${name}.json`, data);
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
