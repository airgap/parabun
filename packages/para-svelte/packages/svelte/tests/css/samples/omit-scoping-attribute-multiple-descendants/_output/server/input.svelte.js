import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	let unknown1 = $.fallback($$props['unknown1'], 'root');
	let unknown2 = $.fallback($$props['unknown2'], 'whatever');

	$$renderer.push(`<div${$.attr_class($.clsx(unknown1), 'svelte-xyz')}><section${$.attr_class($.clsx(unknown2), 'svelte-xyz')}><p class="svelte-xyz">hello</p></section></div>`);
	$.bind_props($$props, { unknown1, unknown2 });
}