import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import dsv from '@rollup/plugin-dsv';
import htmlBundle, { makeHtmlAttributes } from '@rollup/plugin-html';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import childProcess from 'child_process';
import cssnano from 'cssnano';
import livereload from 'rollup-plugin-livereload';
import postcss from 'rollup-plugin-postcss';
import svelte from 'rollup-plugin-svelte';
import svg from 'rollup-plugin-svg';
import sveltePreprocess from 'svelte-preprocess';

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
				title: 'figma2html',
				attributes: {
					html: { lang: 'en' },
					link: null,
					script: null
				},
				meta: [{ charset: 'utf-8' }],
				template: ({ attributes, bundle, files, publicPath, title, meta }) => {
					// inline all script to fit figma's one-file rule
					const scripts = (files.js || []).map(({ code }) => `<script>${code}</script>`).join('\n');

					const links = (files.css || [])
						.map(({ fileName }) => {
							const attrs = makeHtmlAttributes(attributes.link);
							return `<link href="${publicPath}${fileName}" rel="stylesheet"${attrs}>`;
						})
						.join('\n');

					const metas = meta
						.map((input) => {
							const attrs = makeHtmlAttributes(input);
							return `<meta${attrs}>`;
						})
						.join('\n');

					const html = makeHtmlAttributes(attributes.html);

					return `<!DOCTYPE html><html${html}><head>${metas}<title>${title}</title>${links}</head><body>${scripts}</body></html>`;
				}
			}),
			!production && serve(),
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
			commonjs(),
			babel({ babelHelpers: 'bundled' }),
			json(),
			production && terser()
		]
	}
];

function serve() {
	let started = false;

	return {
		writeBundle() {
			if (!started) {
				started = true;

				childProcess.spawn('npm', ['run', 'start', '--', '--dev'], {
					stdio: ['ignore', 'inherit', 'inherit'],
					shell: true
				});
			}
		}
	};
}
