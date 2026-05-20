import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let testName1 = $$props['testName1'];
	let testName2 = $$props['testName2'];

	$$renderer.push(`<div${$.attr_class(testName1 + testName2)}></div>`);
	$.bind_props($$props, { testName1, testName2 });
}