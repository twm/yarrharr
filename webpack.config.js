const path = require('path');
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
]

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
            // Files which must be inlined to avoid a flash on load.
            // label.svg — used as a CSS background image.
            test: /assets\/art\/label\.svg$/,
            use: [{
                loader: 'url-loader',
                options: {
                    limit: 1e20,
                },
            }],
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
                loader: 'svgr/lib/webpack',
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
