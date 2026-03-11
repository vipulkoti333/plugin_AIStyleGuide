const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');

// Load environment variables from the .env file
const env = dotenv.config().parsed;

// Convert environment variables to a format compatible with DefinePlugin
const envKeys = Object.keys(env || {}).reduce((prev, next) => {
	prev[`process.env.${next}`] = JSON.stringify(env[next]);
	return prev;
}, {});

module.exports = {
	mode: 'development', // Use 'production' for production builds
	entry: './cartridges/plugin_custom_AIstyleguide/cartridge/client/default/react/react-entry.js', // Entry point for React components
	plugins: [new webpack.DefinePlugin(envKeys)],
	output: {
		path: path.resolve(__dirname, 'cartridges/plugin_custom_AIstyleguide/cartridge/static/default/js'),
		filename: 'react-bundle.js', // Output file for React components
	},
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-env', '@babel/preset-react'],
					},
				},
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
		],
	},
	resolve: {
		extensions: ['.js', '.jsx'],
	},
};
