<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import JSZip from 'jszip/dist/jszip.min.js';
	import { supabaseUrl, supabaseSecretKey, supabaseBucket } from './env';

	import Panel from './lib/components/Layout/Panel.svelte';
	import ErrorMessage from './lib/components/ErrorMessage.svelte';
	import Footer from './lib/components/Footer.svelte';
	import File from './lib/components/Controls/File.svelte';
	import Images from './lib/components/Controls/Images.svelte';
	import Page from './lib/components/Controls/Page.svelte';
	import Preview from './lib/components/Controls/Preview.svelte';
	import Text from './lib/components/Controls/Text.svelte';
	import Variables from './lib/components/Controls/Variables.svelte';

	// the figma manifest. useful for versioning and meta
	import pkg from './lib/pkg';

	const error = writable({ message: undefined, timeout: undefined } as {
		message: string;
		timeout: number;
	});

	// LOADING STATE
	const loading = writable(false as Loading);

	// PANELS OPEN
	const panels = writable({} as Panels);

	// CONFIG
	const output = writable('svelte' as Output);
	const format = writable('PNG' as Format);
	const scale = writable('1' as Scale);
	const filename = writable(undefined as string | undefined);
	const qElementUrl = writable(undefined as string | undefined);
	const includeResizer = writable(true as boolean);
	const fluid = writable(true as boolean);
	const testingMode = writable(false as boolean);
	const centered = writable(false as boolean);
	const applyStyleNames = writable(false as boolean);
	const styleTextSegments = writable(true as boolean);
	const includeGoogleFonts = writable(true as boolean);
	const maxWidth = writable(undefined as number | undefined);
	const imagePath = writable(undefined as string | undefined);
	const alt = writable(undefined as string | undefined);
	const customScript = writable(undefined as string | undefined);
	const pageName = writable('');
	const pageId = writable('');

	const preview = writable({
		total: 0 as number,
		assets: [] as Asset[],
		file: undefined as HTMLFile | undefined
	} as {
		total: number;
		assets: Asset[];
		file: HTMLFile | undefined;
	});

	const variables = writable({});

	// ingest config data from plugin
	const receiveConfig = (config: Config) => {
		filename.set(config.filename);
		format.set(config.format);
		scale.set(config.scale);
		output.set(config.output);
		qElementUrl.set(config.qElementUrl);
		includeResizer.set(config.includeResizer);
		testingMode.set(config.testingMode);
		maxWidth.set(config.maxWidth);
		fluid.set(config.fluid);
		centered.set(config.centered);
		imagePath.set(config.imagePath);
		alt.set(config.alt);
		applyStyleNames.set(config.applyStyleNames);
		styleTextSegments.set(config.styleTextSegments);
		includeGoogleFonts.set(config.includeGoogleFonts);
		customScript.set(config.customScript);
	};

	// send config data to plugin
	const sendConfig = (): Config => ({
		filename: $filename,
		scale: $scale,
		format: $format,
		output: $output,
		qElementUrl: $qElementUrl,
		includeResizer: $includeResizer,
		testingMode: $testingMode,
		maxWidth: $maxWidth,
		fluid: $fluid,
		centered: $centered,
		imagePath: $imagePath,
		alt: $alt,
		applyStyleNames: $applyStyleNames,
		styleTextSegments: $styleTextSegments,
		includeGoogleFonts: $includeGoogleFonts,
		customScript: $customScript
	});

	// send messages to our plugin
	const postMessage = (message: PostMessage) => parent.postMessage({ pluginMessage: message }, '*');

	window.onmessage = async (event: MessageEvent) => {
		const message = event.data.pluginMessage;
		if (!message) return;
		switch (message.type) {
			case 'load': {
				const config: Config = message.config;
				panels.set(message.panels);
				receiveConfig(config);
				pageName.set(message.pageName);
				pageId.set(message.pageId);
				break;
			}

			case 'variables': {
				const vars = message.variables;
				variables.set(vars);
				break;
			}

			case 'preview': {
				preview.set({
					total: message.preview.total,
					assets: await buildPreviewImages(message.preview.assets),
					file: message.preview.file
				});
				loading.set(message.loading);
				break;
			}

			case 'loading': {
				loading.set(message.loading);
				break;
			}

			case 'export': {
				const link = document.createElement('a');
				link.href = await buildZipArchive(message.assets, message.file);
				link.download = `${$filename}.zip`;
				link.click();
				setTimeout(() => loading.set(false), 1500);
				break;
			}

			case 'publish': {
				try {
					console.log('Publishing...');
					const zipUrl = await buildZipArchive(message.assets, message.file);

					const zipBlob = await fetch(zipUrl).then((r) => r.blob());
					const path = encodeURIComponent(`${$filename}.zip`);
					const storageUrl = `${supabaseUrl}/storage/v1/object/${supabaseBucket}/${path}`;

					const response = await fetch(storageUrl, {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${supabaseSecretKey}`, // Use your regular API key here
							'Content-Type': 'application/octet-stream',
							apikey: supabaseSecretKey, // Use the same API key here
							'x-upsert': true
						},
						body: zipBlob
					});

					const responseText = await response.text();
					console.log(`Zip-Url: ${storageUrl}`);

					// Call the Github Action through a Proxy on Supabase
					// TODO: Error handling for qElementUrl
					const res = await fetch(
						'https://owklekxndbvsydxkzmyt.supabase.co/functions/v1/GHA-proxy',
						{
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'x-plugin-secret': 'MX.uRk66LgKUuvcQV3DWeKGTC9tTsJ'
							},
							body: JSON.stringify({
								zipUrl: storageUrl,
								id: $qElementUrl.split('/').pop(),
								ref: 'main'
							})
						}
					);

					if (!res.ok) {
						const msg = await res.text();
						figma.notify(`Dispatch failed: ${res.status} ${msg.slice(0, 200)}`);
						return;
					}

					if (!response.ok) {
						throw new Error(`Upload failed (${response.status}): ${responseText}`);
					}
				} catch (error) {
					console.error('Upload error:', error);
					setErrorMessage(`Upload failed: ${error.message}`);
				} finally {
					loading.set(false);
				}
				break;
			}

			case 'error': {
				setErrorMessage(message.message);
				break;
			}

			default: {
				break;
			}
		}
	};

	const onChangeConfig = () => postMessage({ type: 'config', config: sendConfig() });

	const onSelectExport = () => {
		if (!$alt || $alt === '') {
			setErrorMessage('Please enter alt text');
			$panels.images = true;
			return;
		}

		if (!$filename || $filename === '') {
			setErrorMessage('File name cannot be empty');
			return;
		}

		loading.set(true);
		postMessage({ type: 'export', config: sendConfig() });
	};

	const onSelectPublish = () => {
		if (!$alt || $alt === '') {
			setErrorMessage('Please enter alt text');
			$panels.images = true;
			return;
		}

		if (!$filename || $filename === '') {
			setErrorMessage('File name cannot be empty');
			return;
		}

		if (!$qElementUrl) {
			setErrorMessage('Q Element required to publish');
			$panels.file = true;
			return;
		}

		loading.set(true);
		postMessage({ type: 'publish', config: sendConfig() });
	};

	const onResetSettings = () => {
		postMessage({ type: 'reset-settings' });
	};

	const onSaveSettings = () => {
		postMessage({ type: 'save-settings' });
	};

	const onLoadSettings = () => {
		postMessage({ type: 'load-settings' });
	};

	const onWriteVariables = () => {
		postMessage({ type: 'write-variables', variables: $variables });
	};

	const onInjectVariables = (e) => {
		postMessage({ type: 'inject-variables', variables: e.detail });
	};

	const onTogglePanel = () => {
		postMessage({ type: 'panels', panels: $panels });
	};

	const setErrorMessage = (message: string) => {
		clearTimeout($error.timeout);
		$error.message = message;

		// clear error message after 3 seconds
		$error.timeout = setTimeout(() => {
			$error.message = undefined;
		}, 3000);
	};

	const buildPreviewImages = async (assets: Asset[]): Promise<Asset[]> => {
		assets.forEach((asset) => {
			const blob = new Blob([asset.data], { type: `image/png` });
			const url = window.URL.createObjectURL(blob);
			asset.url = url;
		});
		return assets;
	};

	const buildZipArchive = async (assets: Asset[], file: HTMLFile): Promise<string> => {
		const zip = new JSZip();

		assets.forEach((asset) => {
			const formatLower = asset.format.toLowerCase();
			const blob = new Blob([asset.data], { type: `image/${formatLower}` });
			zip.file(`${asset.filename}.${formatLower}`, blob, { base64: true });
		});

		const fileBlob = new Blob([file.data], { type: `string` });
		zip.file(`${file.filename}.${file.output.toLowerCase()}`, fileBlob, { base64: true });

		const blob = await zip.generateAsync({ type: 'blob' });
		const url = window.URL.createObjectURL(blob);

		return url;
	};

	onMount(() => postMessage({ type: 'init' }));

	// SVG's are scalable by default. Revert scale config to default
	$: if ($format === 'SVG') scale.set('1');

	setContext('App', {
		pkg,
		loading,
		error,
		preview,
		pageName,
		pageId,
		config: {
			filename,
			format,
			scale,
			output,
			qElementUrl,
			includeResizer,
			testingMode,
			maxWidth,
			fluid,
			centered,
			imagePath,
			alt,
			applyStyleNames,
			styleTextSegments,
			includeGoogleFonts,
			customScript
		},
		variables
	});
</script>

<h1 class="sr-only">{name}</h1>

<article class="flex h-screen flex-col flex-nowrap">
	<div class="border-b border-figma-border bg-figma-bg-secondary px-4 py-2 text-sm">
		Current Page: {$pageName}
	</div>
	<div class="grid w-full flex-auto grid-cols-3 overflow-hidden bg-figma-bg text-figma-text">
		<div
			class="col-span-1 flex flex-col overflow-y-scroll border-r border-solid border-figma-border"
		>
			{#if $panels}
				<Panel title="File settings" open={$panels.file} on:toggle={onTogglePanel}>
					<File on:change={onChangeConfig} on:error={() => setErrorMessage($error.message)} />
				</Panel>
				<Panel title="Image settings" bind:open={$panels.images} on:toggle={onTogglePanel}>
					<Images on:change={onChangeConfig} />
				</Panel>
				<Panel title="Page settings" bind:open={$panels.page} on:toggle={onTogglePanel}>
					<Page on:change={onChangeConfig} />
				</Panel>
				<Panel title="Text settings" bind:open={$panels.text} on:togglePanel={onTogglePanel}>
					<Text on:change={onChangeConfig} />
				</Panel>
				<Panel title="Variables" bind:open={$panels.variables} on:onTogglePanel={onTogglePanel}>
					<Variables
						on:change={onChangeConfig}
						on:write-variables={onWriteVariables}
						on:inject-variables={onInjectVariables}
					/>
				</Panel>
			{/if}
		</div>

		<div class="col-span-2 col-start-2 overflow-y-scroll">
			<Preview />
		</div>
	</div>

	<Footer
		on:export={onSelectExport}
		on:publish={onSelectPublish}
		on:reset-settings={onResetSettings}
		on:save-settings={onSaveSettings}
		on:load-settings={onLoadSettings}
	/>
</article>

{#if $error.message}
	<ErrorMessage />
{/if}
