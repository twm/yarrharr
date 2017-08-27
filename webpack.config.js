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
        vendor: ['react', 'react-addons-pure-render-mixin', 'react-dom',
                 'react-router', 'react-redux'],
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
            test: /\.svg$/,
            loaders: ['file-loader'],
        }],
    },
    output: {
        path: path.join(__dirname, 'yarrharr/static'),
        filename: '[name].[hash].js',
    },
    plugins: plugins,
    devtool: 'source-map',
};
