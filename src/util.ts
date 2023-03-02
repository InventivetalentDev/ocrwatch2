import cv from "@techstark/opencv-js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Jimp from "jimp/es";
import RGBA = tinycolor.ColorFormats.RGBA;

export function tmpImg(src: string): Promise<HTMLImageElement> {
    const img = document.createElement('img');
    img.id = 'tmpimg-' + (Math.random() + 1).toString(36).substring(2);
    img.crossOrigin = 'anonymous';
    document.body.appendChild(img);
    const promise = new Promise<HTMLImageElement>((resolve) => {
        img.onload = function () {
            resolve(img);
        };
    })
    img.src = src;
    setTimeout(() => {
        img.remove();
    }, 1000)
    return promise;
}

export function cleanupText(txt: string) {
    return txt.replace('\n', '').trim();
}

export function parseNumber(txt: string): number {
    if (!txt) return 0;
    txt = txt.replace(',', '');
    txt = txt.replace('.', '');
    txt = txt.replace('o', '0');
    txt = txt.replace('O', '0');
    let parsed = parseInt(txt.trim());
    if (isNaN(parsed)) {
        parsed = 0;
    }
    return parsed;
}

let nameTransform: cv.Mat;

export function getNameTransform(): cv.Mat {
    if (nameTransform) {
        return nameTransform;
    }
    const pts1 = cv.matFromArray(4, 1, cv.CV_32FC2,
        [
            5, 0,
            95, 0,
            0, 25,
            90, 25
        ]
    )
    const pts2 = cv.matFromArray(4, 1, cv.CV_32FC2,
        [
            -5, 0,
            95, 0,
            -3, 25,
            97, 25
        ]
    )
    return nameTransform = cv.getPerspectiveTransform(pts1, pts2)
}

export function getRole(jmp: Jimp): string {
    console.time('getRole')

    jmp = jmp.clone().contrast(0.2);


    const topLeft = Jimp.intToRGBA(jmp.getPixelColor(6, 22));
    const topRight = Jimp.intToRGBA(jmp.getPixelColor(20, 22));
    const bottomLeft = Jimp.intToRGBA(jmp.getPixelColor(6, 38));
    const bottomRight = Jimp.intToRGBA(jmp.getPixelColor(20, 38));

    function isWhite(clr: RGBA) {
        return clr.r > 230 && clr.g > 230 && clr.b > 230;
    }

    function isBg(clr: RGBA) {
        return !isWhite(clr);
    }

    console.timeEnd('getRole');

    // console.log(topLeft);
    // console.log(topRight);
    // console.log(bottomLeft);
    // console.log(bottomRight);

    if (isWhite(topLeft) && isWhite(topRight)) { // tank or dps
        if (isWhite(bottomLeft) && isWhite(bottomRight)) {
            // console.log("dps")
            return 'dps';
        }
        // console.log("tank")
        return 'tank';
    }
    // console.log("support")
    return 'support';

    // return tankCheck ? 'tank' : supportCheck ? 'support' : dpsCheck ? 'dps' :  'unknown';
}
