/**
 * @file Webpack 4 plugin to rasterize a SVG favicon
 *
 * This plugin searches for an asset named "icon-[hexchars].svg". It optimizes
 * this asset with scour, then uses Inkscape to generate two raster versions:
 *
 *   * icon-[hexchars].png — a 152x152 PNG, optimized with optipng.
 *   * icon-[hexchars].ico — ICO with 16x16, 24x24, 32x32, and 64x64 versions.
 *     Built with icotool.
 *
 * The aforementioned CLI tools must be installed and on the PATH so that this
 * plugin can invoke them.
 *
 * Temporary files are generated in the build/ directory.
 *
 * @copyright Tom Most <twm@freecog.net> 2018, 2019, 2020
 * @license GPL-3.0-or-later
 */
const path = require('path');
const { promisify } = require('util');
const { mkdir: mkdirCallback, readFile: readFileCallback, writeFile: writeFileCallback } = require('fs');
const mkdir = promisify(mkdirCallback);
const readFile = promisify(readFileCallback);
const writeFile = promisify(writeFileCallback);
const { execFile: execFileCallback, spawn } = require('child_process');
const execFile = promisify(execFileCallback)

const pluginName = 'FaviconPlugin';

function processFavicon(svgSource) {
    const dir = path.join(__dirname, 'build');
    const file = path.join(dir, 'favicon.svg');
    return mkdir(dir)
        .catch(e => {
            // XXX WTF is there really no structured error info in Node?!
            if (e.code === 'EEXIST') {
                return null;
            }
            throw e;
        })
        .then(_ => writeFile(file, svgSource))
        .then(_ => Promise.all([scourFavicon(file), rasterizeFavicon(file)]))
        .then(([svgAsset, [touchAsset, icoAsset]]) => [svgAsset, touchAsset, icoAsset]);
}

function scourFavicon(file) {
    const outfile = `${file}.scour.svg`;
    const args = [
        '-i', file,
        '-o', outfile,
        '--indent=none',
        '--enable-comment-stripping',
        '--enable-id-stripping',
        '--shorten-ids',
    ];
    return execFile('/usr/bin/scour', args).then(_ => readFile(outfile)).then(bufferToAsset);
}

function rasterizeFavicon(file) {
    return new Promise((resolve, reject) => {
        const inkscape = spawn('inkscape', ['--shell'])
        const outfiles = [];
        var output = '';
        inkscape.stdout.on('data', s => { output += s; })
        inkscape.stderr.on('data', s => { output += s; });
        inkscape.on('close', code => {
            if (code !== 0) {
                reject(new Error(`Inkscape exited ${code}:\n${output}`));
            } else {
                resolve(outfiles);
            }
        });
        [152, 16, 24, 32, 64].forEach(size => {
            const outfile = `${file}.${size}.png`;
            inkscape.stdin.write(`${file} --export-png=${outfile} -w ${size} -h ${size} --export-area-page\n`);
            outfiles.push(outfile);
        });
        inkscape.stdin.end();
    }).then(([touch, ...icoSizes]) => {
        const ico = `${file}.ico`;
        return Promise.all([
            execFile('optipng', ['-quiet', touch]).then(_ => readFile(touch)).then(bufferToAsset),
            execFile('icotool', ['--create', '-o', ico].concat(icoSizes)).then(_ => readFile(ico)).then(bufferToAsset),
        ]);
    });
}

function bufferToAsset(buffer) {
    if (!(buffer instanceof Buffer)) {
        throw new Error(`${buffer} is not a Buffer`);
    }
    return {
        source() { return buffer; },
        size() { return buffer.length; },
    };
}



class FaviconPlugin {
    apply(compiler) {
        compiler.hooks.emit.tapPromise(pluginName, compilation => Promise.resolve()
            .then(_ => {
                const [filename, asset] = function() {
                    for (let filename in compilation.assets) {
                        if (/^icon-[^.]+\.svg$/.test(filename)) {
                            return [filename, compilation.assets[filename]];
                        }
                    }
                }();
                if (!asset) {
                    throw new Error("icon asset not found");
                }
                return processFavicon(asset.source()).then(([svgAsset, touchAsset, icoAsset]) => {
                    compilation.updateAsset(filename, svgAsset);
                    compilation.emitAsset(filename.slice(0, -3) + 'png', touchAsset);
                    compilation.emitAsset(filename.slice(0, -3) + 'ico', icoAsset);
                });
            })
        );
    }
}

module.exports = FaviconPlugin;
