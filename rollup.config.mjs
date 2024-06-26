import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import dsv from '@rollup/plugin-dsv';
import htmlBundle, { makeHtmlAttributes } from '@rollup/plugin-html';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import cssnano from 'cssnano';
import { readFile } from 'node:fs/promises';
import livereload from 'rollup-plugin-livereload';
import postcss from 'rollup-plugin-postcss';
import svelte from 'rollup-plugin-svelte';
import svg from 'rollup-plugin-svg';
import sveltePreprocess from 'svelte-preprocess';

const fileUrl = new URL('./package.json', import.meta.url);
const pkg = JSON.parse(await readFile(fileUrl, 'utf8'));

const production = !process.env.ROLLUP_WATCH;

export default [
	{
		input: 'src/app.js',
		output: {
			format: 'iife',
			name: 'ui',
			file: 'build/bundle.js'
		},
		plugins: [
			svelte({
				preprocess: sveltePreprocess({
					sourceMap: !production,
					postcss: true
				}),
				compilerOptions: {
					dev: !production
				}
			}),
			resolve({
				browser: true,
				dedupe: (importee) => importee === 'svelte' || importee.startsWith('svelte/'),
				extensions: ['.svelte', '.mjs', '.js', '.json', '.node']
			}),
			typescript(),
			commonjs(),
			babel({ babelHelpers: 'bundled' }),
			svg(),
			dsv(),
			json(),
			postcss({
				extensions: ['.css'],
				plugins: [cssnano()]
			}),
			htmlBundle({
				fileName: 'index.html',
				target: 'build/index.html',
				title: pkg.name,
				attributes: {
					html: { lang: 'en' },
					link: null,
					script: null
				},
				meta: [
					{ charset: 'utf-8' },
					{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
					{ name: 'description', content: `${pkg.description} - v${pkg.version}` }
				],
				template: ({ attributes, files, publicPath, title, meta }) => {
					// inline all script to fit figma's one-file rule
					const scripts = (files.js || []).map(({ code }) => `<script>${code}</script>`).join('\n');

					const links = (files.css || [])
						.map(
							({ fileName }) =>
								`<link href="${publicPath}${fileName}" rel="stylesheet"${makeHtmlAttributes(
									attributes.link
								)}>`
						)
						.join('\n');

					const metas = meta.map((input) => `<meta${makeHtmlAttributes(input)}>`).join('\n');

					const html = makeHtmlAttributes(attributes.html);

					return `<!DOCTYPE html><html${html}><head><title>${title}</title>${metas}${links}</head><body><div id='app'></div>${scripts}</body></html>`;
				}
			}),
			!production && livereload('build'),
			production && terser()
		],
		watch: {
			clearScreen: false
		}
	},
	{
		input: 'src/main.ts',
		output: {
			file: 'build/main.js',
			format: 'cjs',
			name: 'main',
			inlineDynamicImports: false
		},
		plugins: [
			typescript(),
			resolve(),
			commonjs(),
			json(),
			babel({ babelHelpers: 'bundled' }),
			production && terser()
		]
	}
];
