const {
  resolve
} = require('path')
const fs = require('fs')
const isDev = process.env.NODE_ENV === 'development'
const {
  CheckerPlugin
} = require('awesome-typescript-loader')
const HtmlPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

const pkgPath = resolve(__dirname, '../package.json')
const pkg = fs.existsSync(pkgPath) ? require(pkgPath) : {}
const {
  theme
} = pkg

module.exports = {
  devtool: isDev ? 'cheap-module-eval-source-map' : 'source-map',
  mode: isDev ? 'development' : 'production',
  entry: {
    background: resolve(__dirname, '../src/background/index.ts'),
    content: resolve(__dirname, '../src/content/index.ts'),
    popup: resolve(__dirname, '../src/popup/index.tsx'),
  },
  output: {
    filename: '[name].js',
    path: isDev ? resolve(__dirname, '../dev/') : resolve(__dirname, '../dist/')
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.d.ts'],
    alias: {
      src: resolve(__dirname, '../src'),
    }
  },
  module: {
    rules: [{
        enforce: "pre",
        test: /\.js$/,
        loader: "source-map-loader"
      },
      {
        enforce: "pre",
        test: /\.tsx?$/,
        loader: "tslint-loader"
      },
      {
        test: /\.(tsx?|jsx?)$/,
        loader: 'awesome-typescript-loader',
        options: {
          transpileOnly: true,
          getCustomTransformers: resolve(__dirname, './ts-loader.js'),
        },
        include: [
          resolve(__dirname, '../src')
        ],
      },
      {
        test: /\.css$/,
        loaders: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: true,
              plugins: [
                require('autoprefixer')(),
              ]
            }
          },
        ]
      },
      {
        test: /.less$/,
        include: [
          resolve(__dirname, '../node_modules/antd'),
        ],
        loaders: [
          'style-loader',
          'css-loader',
          {
            loader: 'less-loader',
            options: {
              sourceMap: true,
              modifyVars: theme,
              javascriptEnabled: true,
            },
          },
        ],
      },
      {
        test: /.styl$/,
        loaders: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
              sourceMap: true,
              localIdentName: '[name]_[local]-[hash:base64:7]',
              importLoaders: 2
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: true,
              plugins: [
                require('autoprefixer')(),
              ]
            }
          },
          {
            loader: 'stylus-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
        exclude: /node_modules/,
      }
    ]
  },
  plugins: [
    new CheckerPlugin(),
    new CopyPlugin([{
        from: resolve(__dirname, '../src/manifest.json'),
        to: './manifest.json'
      },
      {
        from: resolve(__dirname, '../src/images'),
        to: 'images'
      }
    ]),
    new HtmlPlugin({
      template: resolve(__dirname, '../src/popup/index.html'),
      chunks: ['popup'],
    })
  ]
}