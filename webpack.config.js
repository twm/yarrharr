const webpack = require('webpack');
const path = require('path');

const config = {
    entry: './assets/entry.js',
    resolve: {
        modules: [
            path.join(__dirname, 'assets'),
            'node_modules',
        ],
        extensions: [
            '.js',
            '.jsm',
        ],
    },
    module: {
        rules: [{
        // FIXME WP4: Restore eslint
            // test: /\.jsm?$/,
            // enforce: 'pre',
            // loaders: ['eslint-loader'],
            // exclude: /node_modules/,
        // }, {
            test: /\.less$/,
            use: [{
                loader: 'style-loader', // FIXME WP4: Restore separate CSS file
            }, {
                loader: 'css-loader',
                // FIXME WP4
                // options: {minimize: production},
            }, {
                loader: 'less-loader',
                options: {strictMath: true, noIeCompat: true},
            }],
        }, {
            test: /\.jsm?$/,
            loaders: ['babel-loader'],
            exclude: /node_modules/,
        }, {
            // Files which must currently be used as images.
            // icon.svg — included as a file from non-React pages.
            test: /assets\/art\/icon\.svg$/,
            use: [{
                loader: 'file-loader',
                options: {
                    name: '[name]-[hash].[ext]',
                },
            }],
        }],
    },
    output: {
        path: path.resolve(__dirname, 'yarrharr/static'),
        filename: '[name]-[contenthash].js',
    },
    plugins: [
        // TODO
    ],
    devtool: "source-map",
    optimization: {
        runtimeChunk: 'single',
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: /[\\\/]node_modules[\\\/]/,
                    name: 'vendor',
                    chunks: 'all'
                },
            },
        },
    },
    devServer: {
        contentBase: './dist' // FIXME
    },
}

module.exports = config;
