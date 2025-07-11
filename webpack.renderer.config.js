const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/renderer.jsx',  // Le point d'entrée React
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'renderer.js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',  // Ton fichier HTML de base
    }),
  ],
  devServer: {
    static: './dist',
  },
};
