import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let offsetHeight = $$props['offsetHeight'];
	let offsetWidth = $$props['offsetWidth'];
	let toggle = $.fallback($$props['toggle'], false);

	$: if (offsetWidth) {
		toggle = true;
	}

	$$renderer.push(`<div${$.attr_class('svelte-1q40fg9', void 0, { 'toggle': toggle })}><div class="svelte-1q40fg9">${$.escape(offsetHeight)}</div></div>`);
	$.bind_props($$props, { offsetHeight, offsetWidth, toggle });
}