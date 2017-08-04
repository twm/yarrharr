var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    entry: [
        './assets/entry.jsx',
    ],
    resolve: {
        root: __dirname + '/assets',
    },
    output: {
        path: __dirname + '/yarrharr/static',
        filename: 'bundle.js',
    },
    module: {
        preLoaders: [
            {test: /\.jsx?$/, loaders: ['eslint'], exclude: /node_modules/},
        ],
        loaders: [
            {test: /\.less$/, loaders: ['style', 'css', 'less?strictMath&noIeCompat']},
            {test: /\.css$/, loaders: ['style', 'css']},
            {test: /\.jsx?$/, loaders: ['babel'], exclude: /node_modules/},
            {test: /\.svg$/, loaders: ['file']},
        ],
    },
    plugins: [
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.optimize.DedupePlugin(),
        new webpack.NoErrorsPlugin(),
    ],
    devtool: 'source-map',
};
