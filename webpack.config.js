var webpack = require('webpack');

module.exports = {
    entry: [
        'webpack-dev-server/client?http://127.0.0.1:8889/',
        'webpack/hot/only-dev-server',
        './assets/entry.jsx',
    ],
    output: {
        path: __dirname + '/static',
        filename: 'bundle.js',
        publicPath: 'http://127.0.0.1:8889/',
    },
    module: {
        loaders: [
            {test: /\.less$/, loaders: ['style', 'css', 'less?strictMath&noIeCompat']},
            {test: /\.css$/, loaders: ['style', 'css']},
            {test: /\.jsx$/, loaders: ['react-hot', 'babel']},
        ],
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoErrorsPlugin(),
    ],
};
