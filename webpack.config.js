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
            {test: /\.css$/, loaders: ['style', 'css']},
            {test: /\.jsx$/, loaders: ['react-hot', 'jsx-loader?insertPragma=React.DOM&harmony']},
        ],
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoErrorsPlugin(),
    ],
};
