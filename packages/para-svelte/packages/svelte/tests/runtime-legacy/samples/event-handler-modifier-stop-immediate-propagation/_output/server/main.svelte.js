import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let logs = $.fallback($$props['logs'], () => [], true);

		let click_1 = $.fallback($$props['click_1'], () => {
			logs.push('click_1');
		});

		let click_2 = $.fallback($$props['click_2'], () => {
			logs.push('click_2');
		});

		let click_3 = $.fallback($$props['click_3'], () => {
			logs.push('click_3');
		});

		$$renderer.push(`<button>click me</button>`);
		$.bind_props($$props, { logs, click_1, click_2, click_3 });
	});
}