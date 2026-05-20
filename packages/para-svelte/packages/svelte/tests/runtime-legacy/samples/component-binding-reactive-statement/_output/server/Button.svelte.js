import * as $ from 'svelte/internal/server';

export default function Button($$renderer, $$props) {
	let count = $$props['count'];

	function handleClick() {
		count += 1;
	}

	$$renderer.push(`<button>button ${$.escape(count)}</button>`);
	$.bind_props($$props, { count });
}