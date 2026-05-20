import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let enabled = $.fallback($$props['enabled'], false);

	$$renderer.push(`<span><!--[-->`);

	$.slot($$renderer, $$props, 'default', {}, () => {
		if (enabled) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`enabled`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});

	$$renderer.push(`<!--]--></span>`);
	$.bind_props($$props, { enabled });
}