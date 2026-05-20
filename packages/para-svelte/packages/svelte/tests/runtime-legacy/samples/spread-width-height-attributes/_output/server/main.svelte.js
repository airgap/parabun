import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);
	const $$restProps = $.rest_props($$sanitized_props, []);

	$$renderer.push(`<img${$.attributes({ height: '100%', width: '100%', alt: '', ...$$restProps })} onload="this.__e=event" onerror="this.__e=event"/>`);
}