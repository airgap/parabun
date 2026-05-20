import * as $ from 'svelte/internal/server';

let set = new Set(['x']);

export default function Set_1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<p>${$.escape(set.has('x'))}</p>`);
	});
}