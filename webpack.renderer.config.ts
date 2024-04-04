import type { Configuration } from 'webpack'
import path from 'path'
import CopyWebpackPlugin from 'copy-webpack-plugin'

import { rules } from './webpack.rules'
import { plugins } from './webpack.plugins'

const assets = ['svg', 'img']

const copyPlugins = [
  new CopyWebpackPlugin({
    patterns: assets.map(asset => ({
      from: path.resolve(__dirname, 'public', asset),
      to: path.resolve(__dirname, '.webpack/renderer', asset)
    }))
  })
]

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }]
})

export const rendererConfig: Configuration = {
  module: {
    rules
  },
  plugins: [...plugins, ...copyPlugins],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    alias: {
      src: path.resolve(__dirname, 'src/')
    }
  }
}
