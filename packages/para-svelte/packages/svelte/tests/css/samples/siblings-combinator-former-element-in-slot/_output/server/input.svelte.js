import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	$$renderer.push(`<!--[-->`);

	$.slot($$renderer, $$props, 'default', {}, () => {
		$$renderer.push(`<h1 class="svelte-xyz">test</h1>`);
	});

	$$renderer.push(`<!--]--> <span class="svelte-xyz">Hello</span>`);
}