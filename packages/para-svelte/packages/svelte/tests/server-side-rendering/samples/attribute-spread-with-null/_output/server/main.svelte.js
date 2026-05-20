import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);
	const $$restProps = $.rest_props($$sanitized_props, ['id']);
	let id = $.fallback($$props['id'], null);

	$$renderer.push(`<div${$.attributes({ id, ...$$restProps })}></div>`);
	$.bind_props($$props, { id });
}