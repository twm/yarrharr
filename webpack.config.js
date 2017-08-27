const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const extractLESS = new ExtractTextPlugin({
    filename: "[name].[contenthash:base32:20].css",
    // disable: process.env.NODE_ENV !== 'production',
});

module.exports = {
    entry: [
        path.join(__dirname, 'assets/entry.jsx'),
    ],
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
            test: /\.svg$/,
            loaders: ['file-loader'],
        }],
    },
    output: {
        path: path.join(__dirname, 'yarrharr/static'),
        filename: '[name].[hash].js',
    },
    plugins: [
        new webpack.NoEmitOnErrorsPlugin(),
        new CleanWebpackPlugin([path.join(__dirname, 'yarrharr/static')]),
        extractLESS,
    ],
    devtool: 'source-map',
};
