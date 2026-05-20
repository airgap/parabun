import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	const test = { placeholder: 'Text' };

	$$renderer.push(`<input${$.attributes({ ...test }, 'svelte-xyz', void 0, void 0, 4)}/> <div class="svelte-xyz">Should be red, when input is focused</div>`);
}