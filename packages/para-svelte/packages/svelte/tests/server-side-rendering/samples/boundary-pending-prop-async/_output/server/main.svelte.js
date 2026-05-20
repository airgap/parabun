import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

function pending($$renderer) {
	$$renderer.push(`<!---->Loading...`);
}

export default function Main($$renderer) {
	if (pending) {
		$$renderer.push(`<!--[!-->`);
		pending($$renderer);
		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push(`<!--[-->`);

		{
			let data;

			var promises = $$renderer.run([
				async () => data = (await $.save(Promise.resolve('hello')))()
			]);

			$$renderer.push(`<p>`);
			$$renderer.async([promises[0]], ($$renderer) => $$renderer.push(() => $.escape(data)));
			$$renderer.push(`</p>`);
		}

		$$renderer.push(`<!--]-->`);
	}
}