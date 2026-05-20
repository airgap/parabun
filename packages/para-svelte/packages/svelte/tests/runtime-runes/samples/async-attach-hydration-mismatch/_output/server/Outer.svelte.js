import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Outer($$renderer, $$props) {
	let { children } = $$props;

	$$renderer.push(`<div>`);
	children?.($$renderer);
	$$renderer.push(`<!----></div>`);
}