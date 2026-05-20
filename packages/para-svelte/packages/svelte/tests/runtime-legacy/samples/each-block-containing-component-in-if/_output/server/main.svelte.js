import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let show = $$props['show'];
	let fields = $$props['fields'];

	$$renderer.push(`<div>`);
	Nested($$renderer, { show, fields });
	$$renderer.push(`<!----></div>`);
	$.bind_props($$props, { show, fields });
}