import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

function child($$renderer, n) {
	$$renderer.push(`<div>${$.escape(n)}</div>`);
}

export default function Main($$renderer) {
	var n;

	var $$promises = $$renderer.run([
		async () => n = await $.async_derived(() => Promise.resolve(1))
	]);

	$$renderer.async_block([$$promises[0]], ($$renderer) => {
		if (n()) {
			$$renderer.push('<!--[0-->');

			$$renderer.async_block([$$promises[0]], ($$renderer) => {
				child($$renderer, n());
			});
		} else {
			$$renderer.push('<!--[-1-->');
		}
	});

	$$renderer.push(`<!--]--> <p>after</p>`);
}