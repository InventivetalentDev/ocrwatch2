// import {desktopCapturer, ipcRenderer} from 'electron';
//
// console.log('👋 This message is being logged by "offscreen.js", included via webpack');
//
// const video = document.querySelector('video');
// const canvas = document.createElement('canvas');
// let stream: MediaStream;
//
// export function init() {
//
// }
//
// async function createVideo(sourceId: string) {
//     if (video) {
//         try{
//             (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
//         }catch (e) { /* empty */ }
//     }
//
//     stream = await navigator.mediaDevices.getUserMedia({
//         audio: false,
//         video: {
//             mandatory: {
//                 cursor: 'never',
//                 chromeMediaSource: 'desktop',
//                 chromeMediaSourceId: sourceId,
//                 minWidth: 1280,
//                 maxWidth: 1280,
//                 minHeight: 720,
//                 maxHeight: 720
//             }
//         }
//     });
//     video.srcObject = stream
//     video.onloadedmetadata = (e) => {
//         video.play();
//     }
// }
//
// async function takeVideoSnapshot(): Promise<string> {
//     if (!video) {
//         return null;
//     }
//     if (!canvas) {
//         return null;
//     }
//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;
//     const ctx = canvas.getContext('2d');
//     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
//
//     return canvas.toDataURL('image/png');
// }
//
// ipcRenderer.on('setSource', async (event, sourceId) => {
//     console.log("source",sourceId)
//
//     createVideo(sourceId);
// });
//
// ipcRenderer.on('takeScreenshot', async (event)=>{
//     console.log("screenshot");
//
//     const img = await takeVideoSnapshot();
//     ipcRenderer.send('screenshotContent', img);
// })

