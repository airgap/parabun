import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let values = $.fallback($$props['values'], () => ({ a: 'abc', b: 'def' }), true);
		let paths = $.fallback($$props['paths'], () => ['a'], true);
		let logs = $.fallback($$props['logs'], () => [], true);

		$: paths && logs.push('paths updated');

		$$renderer.push(`<input${$.attr('value', values[paths[0]])}/>`);
		$.bind_props($$props, { values, paths, logs });
	});
}