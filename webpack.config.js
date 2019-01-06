const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const FaviconPlugin = require('./favicon.js');

const RELEASE = 'release';
const DEV_STATIC = 'dev-static';
const DEV_HOT = 'dev-hot';

const runmode = DEV_HOT;

function hotify(namePattern) {
    if (runmode === DEV_HOT) {
        return namePattern.replace(/\[(content)?hash\]/, 'hot');
    }
    return namePattern;
}

const config = {
    mode: runmode === RELEASE ? 'production' : 'development',
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
                // Use style-loader for hot module reloading. Otherwise extract
                // CSS to files.
                loader: runmode === DEV_HOT ? 'style-loader' : MiniCssExtractPlugin.loader,
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
                    name: hotify('[name]-[hash].[ext]'),
                },
            }],
        }],
    },
    output: {
        path: path.resolve(__dirname, 'yarrharr/static'),
        filename: hotify('[name]-[contenthash].js'),
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: hotify("[name]-[contenthash].css"),
        }),
        new FaviconPlugin(),
        new webpack.DefinePlugin({
            __debug__: JSON.stringify(runmode !== RELEASE),
            __hot__: JSON.stringify(runmode === DEV_HOT),
        }),
        new webpack.HotModuleReplacementPlugin(),
    ],
    devtool: "source-map",
    optimization: {
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    ecma: 6,
                    module: true,
                    compress: {
                        global_defs: {
                            // Tersify refuses to do code elimination when the constant is defined
                            // as "const __debug__ = process.env.NODE_ENV !== 'production'": it
                            // translates that comparison to false (actually !1) but doesn't
                            // propagate the value like uglify did. However, if we define __debug__
                            // directly here code elimination works.
                            __debug__: false, // FIXME runmode !== RELEASE,
                        },
                    },
                    mangle: {
                        // Never mangle these names so that the build script can grep for them as
                        // a sanity check. Note that propTypes would normally never be mangled, but
                        // __debug__ would be.
                        reserved: ['__debug__', 'propTypes'],
                    },
                    output: {
                        // Keep the line length sane to make inspecting the bundle easier.
                        max_line_len: 180,
                        // TODO: Insert a license comment.
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
        allowedHosts: ['127.0.0.1'],
        host: '127.0.0.1',
        port: 8889,
        hot: true,
        index: '', // Proxy / instead of serving a file.
        proxy: {
            '/': 'http://127.0.0.1:8888',  // Django dev server.
        },
        publicPath: 'http://127.0.0.1:8889/static/',
        contentBase: path.join(__dirname, 'yarrharr/static'),
    },
}

module.exports = config;
