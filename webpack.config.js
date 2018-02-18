const path = require('path');
const { promisify } = require('util');
const { mkdir: mkdirCallback, readFile: readFileCallback, writeFile: writeFileCallback } = require('fs');
const mkdir = promisify(mkdirCallback);
const readFile = promisify(readFileCallback);
const writeFile = promisify(writeFileCallback);
const { execFile: execFileCallback, spawn } = require('child_process');
const execFile = promisify(execFileCallback)
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const MinifyPlugin = require("babel-minify-webpack-plugin");
const production = process.env.NODE_ENV === 'production';

const extractLESS = new ExtractTextPlugin({
    filename: "[name].[contenthash:base32:20].css",
    // disable: production,
});

const plugins = [
    new webpack.NoEmitOnErrorsPlugin(),
    new CleanWebpackPlugin([path.join(__dirname, 'yarrharr/static')]),
    extractLESS,
    new webpack.DefinePlugin({
        'process.env': {
            NODE_ENV: JSON.stringify(production ? 'production' : 'development'),
        },
    }),
    {
        apply: function rasterizeFaviconPlugin(compiler) {
            compiler.plugin('emit', (compilation, callback) => {
                const [filename, asset] = function() {
                    for (let filename in compilation.assets) {
                        if (/^icon\.[^.]+\.svg$/.test(filename)) {
                            return [filename, compilation.assets[filename]];
                        }
                    }
                }();
                if (!asset) {
                    console.error("icon asset not found")
                    callback();
                    return
                }
                processFavicon(asset.source()).then(([svgAsset, touchAsset, icoAsset]) => {
                    compilation.assets[filename] = svgAsset;
                    compilation.assets[filename.slice(0, -3) + 'png'] = touchAsset;
                    compilation.assets[filename.slice(0, -3) + 'ico'] = icoAsset;
                    callback();
                }).catch(callback);
            });
        },
    },
]


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
    const outfile = `file.scour.svg`;
    const args = [
        '-i', file,
        '-o', outfile,
        '--indent=none',
        '--enable-comment-stripping',
        '--enable-id-stripping',
        '--shorten-ids',
    ];
    return execFile('scour', args).then(_ => readFile(outfile)).then(bufferToAsset);
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

if (production) {
    plugins.push(new webpack.optimize.CommonsChunkPlugin({
        name: 'vendor',
    }));
    plugins.push(new MinifyPlugin({}, {sourceMap: true}));
}

module.exports = {
    entry: {
        main: path.join(__dirname, 'assets/entry.jsx'),
        vendor: ['react', 'react-dom', 'react-redux', 'redux-thunk', 'redux-logger'],
    },
    resolve: {
        modules: [
            path.join(__dirname, 'assets'),
            'node_modules',
        ],
    },
    module: {
        rules: [{
            test: /\.jsx?$/,
            enforce: 'pre',
            loaders: ['eslint-loader'],
            exclude: /node_modules/,
        }, {
            test: /\.less$/,
            use: extractLESS.extract({
                use: [{
                    loader: 'css-loader',
                    options: {minimize: production},
                }, {
                    loader: 'less-loader',
                    options: {strictMath: true, noIeCompat: true},
                }],
                // Used when disabled above (for compatibility with HMR?):
                fallback: 'style-loader',
            }),
        }, {
            test: /\.jsx?$/,
            loaders: ['babel-loader'],
            exclude: /node_modules/,
        }, {
            // Files which must currently be used as images.
            // icon.svg — included as a file from non-React pages.
            test: /assets\/art\/icon\.svg$/,
            use: [{
                loader: 'file-loader',
                options: {
                    name: '[name].[hash].[ext]',
                },
            }],
        }, {
            test: /assets\/icons\/.*\.svg$/,
            use: ['babel-loader', './svghack.js', {
                loader: 'svgr/webpack',
                options: {
                    // See https://github.com/smooth-code/svgr#options
                    // Be sure icon SVGs have a viewBox attribute!
                    icon: true,  // width=1em height=1em
                },
            }],
        }],
    },
    output: {
        path: path.join(__dirname, 'yarrharr/static'),
        filename: '[name].[hash].js',
    },
    plugins: plugins,
    devtool: 'source-map',
};
