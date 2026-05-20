import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);

	$$renderer.push(`<div><!--[-->`);
	$.slot($$renderer, $$props, 'default', {}, null);
	$$renderer.push(`<!--]--> <div${$.attributes({ ...$$sanitized_props })}></div></div>`);
}