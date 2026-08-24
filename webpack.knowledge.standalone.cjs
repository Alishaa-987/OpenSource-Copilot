const path = require('node:path');
const nodeExternals = require('webpack-node-externals');

const root = __dirname;
const alias = {
  '@osc/contracts': path.join(root, 'libs/contracts/src/index.ts'),
  '@osc/config': path.join(root, 'libs/config/src/index.ts'),
  '@osc/observability': path.join(root, 'libs/observability/src/index.ts'),
  '@osc/shared': path.join(root, 'libs/shared/src/index.ts'),
  '@osc/database': path.join(root, 'libs/database/src/index.ts'),
  '@osc/kafka': path.join(root, 'libs/kafka/src/index.ts'),
  '@osc/github': path.join(root, 'libs/github/src/index.ts'),
};

module.exports = {
  mode: 'production',
  target: 'node',
  entry: path.join(root, 'apps/knowledge-service/src/main.ts'),
  output: {
    path: path.join(root, 'dist/apps/knowledge-service'),
    filename: 'main.js',
    clean: false,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.join(root, 'apps/knowledge-service/tsconfig.app.json'),
            transpileOnly: true,
          },
        },
      },
    ],
  },
  externalsPresets: { node: true },
  externals: [nodeExternals()],
  optimization: { minimize: false },
  devtool: false,
};
