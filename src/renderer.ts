/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';

import {desktopCapturer, ipcRenderer} from 'electron';

console.log('👋 This message is being logged by "renderer.js", included via webpack');

setTimeout(() => {
    ipcRenderer.send('initVideo');
}, 100);

const imageTypes: Set<string> = new Set<string>();

document.getElementById('screenshotBtn').addEventListener('click', e => {
    console.log("screenshotBtn takeScreenshot")
    ipcRenderer.send('takeScreenshot');
});

(document.getElementById('imageSelect') as HTMLSelectElement).addEventListener('click', e => {
    document.querySelectorAll('.image-content').forEach(e => (e as HTMLElement).style.display = 'none');
    document.getElementById('img-' + (e.currentTarget as HTMLSelectElement).value).style.display = '';
});

// ipcRenderer.on('screenshotContent', async (event, sourceId) => {
//     console.log("source",sourceId)
//     document.getElementById('screenshotPreview').src = sourceId
// });

ipcRenderer.on('imageContent', async (event, imageType, content) => {
    let element = document.getElementById(`img-${imageType}`) as HTMLImageElement;
    if (!element) {
        element = document.createElement('img') as HTMLImageElement;
        element.className = 'image-content';
        element.id = `img-${imageType}`;
        element.style.display = 'none';
        document.body.appendChild(element);

        imageTypes.add(imageType);
        const select = (document.getElementById('imageSelect') as HTMLSelectElement);
        const option = document.createElement('option') as HTMLOptionElement;
        option.value = imageType;
        option.text = imageType;
        select.appendChild(option);
    }
    element.src = content;
})
