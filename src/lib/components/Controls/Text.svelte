<script>
	import { getContext } from 'svelte';

	import Checkbox from '../Inputs/Checkbox.svelte';

	const {
		config: { applyStyleNames, styleTextSegments }
	} = getContext('App');
</script>

<div class="flex w-full flex-col gap-2">
	<Checkbox
		label="Style text segments"
		bind:value={$styleTextSegments}
		bind:checked={$styleTextSegments}
	/>
	<Checkbox
		label="Include Figma styles as classes"
		bind:value={$applyStyleNames}
		bind:checked={$applyStyleNames}
	/>
</div>
