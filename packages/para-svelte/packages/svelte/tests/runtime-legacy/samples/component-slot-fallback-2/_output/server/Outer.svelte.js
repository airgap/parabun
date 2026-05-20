import * as $ from 'svelte/internal/server';
import Inner from "./Inner.svelte";

export default function Outer($$renderer, $$props) {
	let defaultValue = $.fallback($$props['defaultValue'], '');
	let slotProps = $.fallback($$props['slotProps'], '');

	$$renderer.push(`<!--[-->`);

	$.slot($$renderer, $$props, 'default', { slotProps }, () => {
		Inner($$renderer, { value: defaultValue });
	});

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { defaultValue, slotProps });
}