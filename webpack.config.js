const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const FaviconPlugin = require('./favicon.js');

/**
 * Yarrharr's Webpack build has three modes, defined by these constants. The
 * RUNMODE environment variable must have one of these values.
 *
 * - RELEASE — production build with minification, etc. Artifacts are written
 *   to yarrharr/static/ with content-hashed filenames.
 */
const RELEASE = 'release';

const runmode = process.env.RUNMODE;
if (runmode != RELEASE) {
    throw new Error(`Invalid RUNMODE environment variable '${runmode}'`);
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
            // rules: [{loader: 'eslint-loader'}],
            // exclude: /node_modules/,
        // }, {
            test: /\.less$/,
            rules: [{
                loader: MiniCssExtractPlugin.loader,
            }, {
                loader: 'css-loader',
                options: {sourceMap: true}
            }, {
                loader: 'less-loader',
                options: {
                    sourceMap: true,
                    lessOptions: {
                        strictMath: true,
                        noIeCompat: true,
                    },
                },
            }],
        }, {
            test: /\.jsm?$/,
            rules: [{
                loader: 'babel-loader',
            }],
            exclude: /node_modules/,
        }, {
            // Files that must currently be used as images because they are
            // included from non-React pages:
            test: /assets\/art\/(icon|logotype|lettertype)\.svg$/,
            rules: [{
                loader: 'file-loader',
                options: {
                    name: '[name]-[hash].[ext]',
                },
            }],
        }],
    },
    output: {
        path: path.resolve(__dirname, 'yarrharr/static'),
        publicPath: '/static/',
        filename: '[name]-[contenthash].js',
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "[name]-[contenthash].css",
        }),
        new FaviconPlugin(),
        new webpack.DefinePlugin({
            __hot__: 'false',
            __debug__: 'false',
        }),
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
                            __debug__: runmode !== RELEASE,
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
};

module.exports = config;
