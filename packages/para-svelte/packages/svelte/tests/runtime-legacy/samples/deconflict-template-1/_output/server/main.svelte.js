import * as $ from 'svelte/internal/server';
import { template } from './module.js';

export default function Main($$renderer, $$props) {
	let value = $.fallback($$props['value'], template);

	$$renderer.push(`<!---->${$.escape(value)}`);
	$.bind_props($$props, { value });
}