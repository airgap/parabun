import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Inner($$renderer) {
	function renderContent(node) {
		node.textContent = 'foo';
	}

	var test;
	var $$promises = $$renderer.run([async () => test = await Promise.resolve('foo')]);

	$$renderer.push(`<p>`);
	$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(test)));
	$$renderer.push(`</p> <div></div>`);
}