module.exports = {
    entry: './assets/entry.js',
    output: {
        path: __dirname + '/static',
        filename: 'bundle.js',
    },
    module: {
        loaders: [
            {test: /\.css$/, loader: "style!css"},
            {test: /\.jsx$/, loader: "jsx-loader?insertPragma=React.DOM&harmony"},
        ],
    },
};
