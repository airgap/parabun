import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';
import Inner from './Inner.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let logs = $.fallback($$props['logs'], () => [], true);

		function foo() {
			logs.push(this);
		}

		function bar() {
			logs.push(this);
		}

		Widget($$renderer, {});
		$.bind_props($$props, { logs, Inner });
	});
}