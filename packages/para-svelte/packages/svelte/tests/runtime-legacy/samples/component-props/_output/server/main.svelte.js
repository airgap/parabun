import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);
	const $$restProps = $.rest_props($$sanitized_props, ['visible']);
	let visible = $$props['visible'];

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`${$.escape(JSON.stringify($$sanitized_props))} ${$.escape(JSON.stringify($$restProps))}`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}