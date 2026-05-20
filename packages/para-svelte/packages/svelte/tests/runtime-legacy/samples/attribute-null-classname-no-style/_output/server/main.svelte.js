import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let testName = $$props['testName'];

	$$renderer.push(`<div${$.attr_class($.clsx(testName))}></div>`);
	$.bind_props($$props, { testName });
}