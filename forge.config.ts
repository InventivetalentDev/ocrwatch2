import type {ForgeConfig} from '@electron-forge/shared-types';
import {MakerSquirrel} from '@electron-forge/maker-squirrel';
import {MakerZIP} from '@electron-forge/maker-zip';
import {MakerDeb} from '@electron-forge/maker-deb';
import {MakerRpm} from '@electron-forge/maker-rpm';
import {WebpackPlugin} from '@electron-forge/plugin-webpack';
import {spawn} from 'child_process'

import {mainConfig} from './webpack.main.config';
import {rendererConfig} from './webpack.renderer.config';
import * as path from "path";
import * as fs from "fs-extra";

const config: ForgeConfig = {
    packagerConfig: {
        asar: true
    },
    rebuildConfig: {},
    makers: [new MakerSquirrel({}), new MakerZIP({}, ['darwin']), new MakerRpm({}), new MakerDeb({})],
    plugins: [
        new WebpackPlugin({
            mainConfig,
            devContentSecurityPolicy: '',
            renderer: {
                config: rendererConfig,
                entryPoints: [
                    {
                        html: './src/index.html',
                        js: './src/renderer.ts',
                        name: 'main_window',
                        preload: {
                            js: './src/preload.ts',
                        },
                    },
                    {
                        html: './src/render/offscreen.html',
                        js: './src/render/offscreen.ts',
                        name: 'render_offscreen'
                    },
                ],
            },
        })
    ],
    hooks: {
        readPackageJson: async (forgeConfig, packageJson) => {
            // only copy deps if there isn't any
            if (Object.keys(packageJson.dependencies).length === 0) {
                const originalPackageJson = await fs.readJson(path.resolve(__dirname, 'package.json'));
                const webpackConfigJs = rendererConfig;
                Object.keys(webpackConfigJs.externals).forEach(pack => {
                    packageJson.dependencies[pack] = originalPackageJson.dependencies[pack];
                });
            }
            return packageJson;
        },
        packageAfterPrune: async (forgeConfig, buildPath) => {
            console.log(buildPath);
            return new Promise((resolve, reject) => {
                const npmInstall = spawn('npm', ['install'], {
                    cwd: buildPath,
                    stdio: 'inherit',
                    shell: true
                });

                npmInstall.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error('process finished with error code ' + code));
                    }
                });

                npmInstall.on('error', (error) => {
                    reject(error);
                });
            });
        }
    }
};

export default config;
