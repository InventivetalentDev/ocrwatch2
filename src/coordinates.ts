import {Offset, Rect} from "./types";

export class Coordinates {
    static screen = {
        width: 1920,
        height: 1080
    }
    static scoreboard = {
        allies: <Rect>{
            from: [312, 193],
            size: [848, 307],
            stats1: <Rect>{
                from: [688, 193],
                size: [166, 307]
            },
            stats2: <Rect>{
                from: [858, 193],
                size: [303, 305]
            }
        },
        enemies: <Rect>{
            from: [312, 613],
            size: [848, 307],
            stats1: <Rect>{
                from: [688, 613],
                size: [166, 307]
            },
            stats2: <Rect>{
                from: [858, 615],
                size: [303, 305]
            }
        },
        rowHeight: 62,
        rowMargin: 8,
        offsets: {
            nameAlly: <Offset>{
                x: 145,
                w: 210
            },
            nameEnemy: <Offset>{ // (no ult charge)
                x: 90,
                w: 210
            },
            elims: <Offset>{
                x: 384,
                w: 50
            },
            assists: <Offset>{
                x: 435,
                w: 50
            },
            deaths: <Offset>{
                x: 490,
                w: 50
            },
            damage: <Offset>{
                x: 600,
                w: 50
            },
            healing: <Offset>{
                x: 700,
                w: 50
            },
            mitigated: <Offset>{
                x: 800,
                w: 50
            }
        },
        nameOffsetAlly: 145,
        nameOffsetEnemy: 90, // (no ult charge)
        elimsOffset: 384,
        elimsWidth: 50,
        assistsOffset: 435,
        assistsWidth: 50,
        deathsOffset: 490,
        deathsWidth: 50
    }
    static self = {
        name: <Rect>{
            from: [170, 955],
            size: [250, 45]
        },
        hero: <Rect>{
            from: [1190, 350],
            size: [280, 60]
        },
        stats: <Rect>{
            from: [1195, 410],
            size: [370, 200],
            height: 62
        }
    }
    static match = {
        wrapper: <Rect>{
            from: [120, 30],
            size: [700, 30]
        },
        time: <Rect>{
            from: [188, 60],
            size: [100, 35]
        },
        status: <Rect>{
            from:[600,13],
            size: [830,76]
        }
    }
    static performance = {
        wrapper: <Rect>{
            from: [0, 0],
            size: [500, 18]
        }
    }
}
