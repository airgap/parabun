import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let className = $$props['className'];

	$$renderer.push(`<div${$.attr_class($.clsx(className))}></div>`);
	$.bind_props($$props, { className });
}