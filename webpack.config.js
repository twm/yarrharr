const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const FaviconPlugin = require('./favicon.js');

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
                loader: MiniCssExtractPlugin.loader,
            }, {
                loader: 'css-loader',
                options: {sourceMap: true}
            }, {
                loader: 'less-loader',
                options: {strictMath: true, noIeCompat: true, sourceMap: true},
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
        new MiniCssExtractPlugin({
            filename: "[name]-[contenthash].css",
        }),
        new FaviconPlugin(),
        // TODO: HMR plugin? or does that go in devServer?
    ],
    devtool: "source-map",
    optimization: {
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    ecma: 6,
                    module: true,
                    // warnings: true,
                    define: {
                        // Tersify refuses to do code elimination when the constant is defined
                        // as "const __debug__ = process.env.NODE_ENV !== 'production'", but
                        // this seems to work:
                        __debug__: false,
                    },
                    compress: {
                        // booleans: false, // Prevents conversion of false -> !1
                    },
                    mangle: {
                        reserved: ['__debug__'],
                    },
                    output: {
                        max_line_len: 180,
                    },
                },
            }),
        ],
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
