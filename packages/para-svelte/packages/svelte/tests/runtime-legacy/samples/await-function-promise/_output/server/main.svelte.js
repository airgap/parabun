import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let promise = $$props['promise'];

	$.await($$renderer, promise, () => {}, (value) => {
		$$renderer.push(`<p>${$.escape(JSON.stringify(value))}</p>`);
	});

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { promise });
}