import {GameData} from "../types";
import * as fs from "fs";
import Jimp from "jimp";
import * as influx1 from "influx";
import * as influx2 from "@influxdata/influxdb-client"

import config from "../../config.json";
import {ClientOptions} from "@influxdata/influxdb-client";
import {GoogleSpreadsheet} from "google-spreadsheet";

export class Output {

    /**
     * write current game state
     */
    writeGameNow(data: GameData): void | Promise<void> {
        return null;
    }

    /**
     * write game data at end of game (win/loss/draw)
     */
    writeGameResult(data: GameData): void | Promise<void> {
        return null;
    }

    writeImage(data: GameData, jmp: Jimp, canvas: string): void | Promise<void> {
        return null;
    }

}

export class JsonOutput extends Output {

    writeGameResult(data: GameData) {
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
            "gamemode",
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
            data.match.gamemode,
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

    writeGameResult(data: GameData) {
        const row = this.makeRow(data).join("\t");
        const out = "./output/games.tsv";
        if (!fs.existsSync(out)) {
            this.writeRow(out, this.getHeader().join('\t'))
        }
        this.writeRow(out, row);
    }

}

export class CSVOutput extends RowOutput {

    writeGameResult(data: GameData) {
        const row = this.makeRow(data).join(",");
        const out = "./output/games.csv";
        if (!fs.existsSync(out)) {
            this.writeRow(out, this.getHeader().join(','))
        }
        this.writeRow(out, row);
    }

}

export class GoogleSheetsOutput extends RowOutput {

    private sheet: GoogleSpreadsheet;

    constructor() {
        super();
        if(!config.outputs?.gsheets) return;
        this.sheet = new GoogleSpreadsheet(config.outputs.gsheets.sheet);
        this.sheet.useServiceAccountAuth({
            private_key: config.outputs.gsheets.private_key,
            client_email: config.outputs.gsheets.client_email
        })
            .then(() => {
                return this.sheet.loadInfo()
            })
    }

    async writeGameResult(data: GameData) {
        if (!this.sheet) return
        if(!config.outputs?.gsheets) return;
        const sheet = this.sheet.sheetsByIndex[0]
        if (sheet.rowCount <= 0) {
            // await sheet.addRow(this.getHeader());
            await sheet.setHeaderRow(this.getHeader());
        }
        await sheet.addRow(this.makeRow(data));
    }

}

export class Influx1Output extends Output {

    private influx: influx1.InfluxDB;

    constructor() {
        super();
        if (!config || !config.outputs || !config.outputs.influx || !config.outputs.influx.enabled) return
        const influxConfig: influx1.ISingleHostConfig & any = config.outputs.influx;
        influxConfig.schema = [
            {
                measurement: config.outputs.influx.measurement || 'ocrwatch_games',
                fields: {
                    duration: influx1.FieldType.INTEGER
                },
                tags: [
                    'account',
                    'hero',
                    'mode',
                    'map',
                    'competitive',
                    'state'
                ]
            }
        ]
        this.influx = new influx1.InfluxDB(influxConfig);
    }

    writeGameResult(data: GameData) {
        if (!this.influx) return;
        //TODO
    }

}

export class Influx2Output extends Output {

    private influx: influx2.InfluxDB;
    private writeApi: influx2.WriteApi;

    constructor() {
        super();
        if (!config || !config.outputs || !config.outputs.influx2 || !config.outputs.influx2.enabled) return
        const influxConfig: ClientOptions & any = config.outputs.influx2;
        this.influx = new influx2.InfluxDB(influxConfig)
        this.writeApi = this.influx.getWriteApi(influxConfig.org, influxConfig.bucket);
    }

    writeGameResult(data: GameData) {
        if (!this.influx || !this.writeApi) return;
        //TODO
    }

}
