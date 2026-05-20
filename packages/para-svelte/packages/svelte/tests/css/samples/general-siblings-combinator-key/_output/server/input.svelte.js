import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<div class="a svelte-xyz"></div> <!---->`);

	{
		$$renderer.push(`<div class="b svelte-xyz"></div>`);
	}

	$$renderer.push(`<!----> <div class="c svelte-xyz"></div>`);
}