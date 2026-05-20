import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	let foo = true;
	let bar = true;

	$$renderer.push(`<div class="a svelte-xyz"></div> `);

	if (foo) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div class="b svelte-xyz"></div>`);
	} else if (bar) {
		$$renderer.push('<!--[1-->');
		$$renderer.push(`<div class="c svelte-xyz"></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--> <div class="d svelte-xyz"></div>`);
}