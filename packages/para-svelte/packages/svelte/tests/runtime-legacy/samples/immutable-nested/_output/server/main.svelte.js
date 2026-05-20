import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let nested = $$props['nested'];

	$$renderer.push(`<div>`);
	Nested($$renderer, {});
	$$renderer.push(`<!----></div>`);
	$.bind_props($$props, { nested });
}