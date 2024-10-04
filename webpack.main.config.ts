import path from 'path';
import type { Configuration } from 'webpack';
import { plugins } from './webpack.plugins';
import { rules } from './webpack.rules';

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/window/index.ts',
  // Put your normal webpack config below here
  module: {
    rules
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
    alias: {
      src: path.resolve(__dirname, 'src/'),
      bin: path.resolve(__dirname, 'bin/')
    }
  }
};
