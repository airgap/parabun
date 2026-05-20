import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let testName1 = $$props['testName1'];
	let testName2 = $$props['testName2'];

	function myHelper(testName) {
		return testName;
	}

	$$renderer.push(`<div${$.attr_class(myHelper(testName1) + myHelper(testName2))}></div>`);
	$.bind_props($$props, { testName1, testName2 });
}