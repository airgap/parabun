import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let indeterminate = $$props['indeterminate'];

	$$renderer.push(`<input type="checkbox"${$.attr('indeterminate', indeterminate, true)}/>`);
	$.bind_props($$props, { indeterminate });
}