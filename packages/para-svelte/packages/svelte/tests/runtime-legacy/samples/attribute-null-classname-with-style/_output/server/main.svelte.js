import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let testName = $$props['testName'];

	function _() {
		// Make the prop a source. Difference from Svelte 4.
		testName = '';
	}

	$$renderer.push(`<div${$.attr_class($.clsx(testName), 'svelte-70s021')}></div>`);
	$.bind_props($$props, { testName, _ });
}