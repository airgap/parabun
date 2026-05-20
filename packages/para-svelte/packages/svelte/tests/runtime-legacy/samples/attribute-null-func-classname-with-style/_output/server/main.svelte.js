import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let testName = $$props['testName'];

	function myHelper(testName) {
		return testName;
	}

	$$renderer.push(`<div${$.attr_class($.clsx(myHelper(testName)), 'svelte-70s021')}></div>`);
	$.bind_props($$props, { testName });
}