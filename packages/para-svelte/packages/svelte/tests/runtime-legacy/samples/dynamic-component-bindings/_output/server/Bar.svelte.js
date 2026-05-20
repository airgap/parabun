import * as $ from 'svelte/internal/server';

export default function Bar($$renderer, $$props) {
	let z = $$props['z'];

	$$renderer.push(`<p>bar</p> <input type="checkbox"${$.attr('checked', z, true)}/>`);
	$.bind_props($$props, { z });
}