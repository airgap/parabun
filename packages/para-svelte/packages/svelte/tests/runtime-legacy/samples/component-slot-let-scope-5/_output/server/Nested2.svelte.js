import * as $ from 'svelte/internal/server';

export default function Nested2($$renderer, $$props) {
	$$renderer.push(`<!--[-->`);
	$.slot($$renderer, $$props, 'footer', {}, null);
	$$renderer.push(`<!--]-->`);
}