const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    renderer: './src/renderer.jsx',
    basic: './src/basic-pitch.jsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js', // Donne renderer.js et basic.js
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      chunks: ['basic','renderer'], // Page principale
      filename: 'index.html',
    }),
  ],
};
