import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { x, y, deferred } = $$props;
		var $$promises = $$renderer.run([async () => void (y = await deferred.promise)]);

		$$renderer.push(`<p>x: ${$.escape(x)}</p> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>Loading...</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}