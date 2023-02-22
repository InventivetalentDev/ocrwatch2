export class Coordinates {
    static screen = {
        width: 1920,
        height: 1080
    }
    static scoreboard = {
        allies: {
            from: [312, 193],
            to: [1160, 500],
            size: [848, 307]
        },
        enemies: {
            from: [312, 613],
            to: [1160, 920],
            size: [848, 307]
        },
        rowHeight:62,
        rowMargin: 8,
        offsets: {
            nameAlly: {
                x:145,
                w: 210
            },
            nameEnemy: { // (no ult charge)
                x: 90,
                w: 210
            },
            elims: {
                x: 384,
                w:50
            },
            assists: {
                x:435,
                w:50
            },
            deaths: {
                x: 490,
                w:50
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
        name: {
            from: [170, 955],
            size: [250, 45]
        },
        hero: {
            from: [1190, 350],
            size: [280, 60]
        }
    }
    static match = {
        wrapper: {
            from: [120, 30],
            size: [700, 30]
        },
        time: {
            from: [188,60],
            size: [100,35]
        }
    }
    static performance  = {
        wrapper: {
            from: [0,0],
            size: [500,18]
        }
    }
}
