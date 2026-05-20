import * as $ from 'svelte/internal/server';
import { slide } from "svelte/transition";

export default function Main($$renderer, $$props) {
	let open = $.fallback($$props['open'], false);
	let color = $.fallback($$props['color'], "red");
	let border = $.fallback($$props['border'], false);

	$$renderer.push(`<p>foo</p> `);

	if (open) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<p${$.attr_class($.clsx(color), 'svelte-70s021', { 'border': border })}>bar</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { open, color, border });
}