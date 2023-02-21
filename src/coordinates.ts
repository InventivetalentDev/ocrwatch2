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
        rowMargin: 8
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
