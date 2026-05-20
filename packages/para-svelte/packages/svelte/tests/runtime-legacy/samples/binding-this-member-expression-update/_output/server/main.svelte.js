import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let container = $.fallback($$props['container'], () => ({}), true);
		let paths = $.fallback($$props['paths'], () => ['a'], true);
		let logs = $.fallback($$props['logs'], () => [], true);

		$: paths && logs.push('paths updated');

		$$renderer.push(`<div></div>`);
		$.bind_props($$props, { container, paths, logs });
	});
}