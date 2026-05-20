import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.push(`<!--[-->`);

	{
		let x;
		var promises = $$renderer.run([async () => x = (await $.save('this should work'))()]);

		$$renderer.push(`<div>`);
		$$renderer.async([promises[0]], ($$renderer) => $$renderer.push(() => $.escape(x)));
		$$renderer.push(`</div>`);
	}

	$$renderer.push(`<!--]-->`);
}