var webpack = require('webpack');

module.exports = {
    entry: [
        './assets/entry.jsx',
    ],
    output: {
        path: __dirname + '/yarrharr/static',
        filename: 'bundle.js',
    },
    module: {
        loaders: [
            {test: /\.less$/, loaders: ['style', 'css', 'less?strictMath&noIeCompat']},
            {test: /\.css$/, loaders: ['style', 'css']},
            {test: /\.jsx?$/, loaders: ['babel']},
            {test: /\.svg$/, loaders: ['file']},
        ],
    },
    plugins: [
        new webpack.NoErrorsPlugin(),
    ],
    devtool: 'source-map',
};
