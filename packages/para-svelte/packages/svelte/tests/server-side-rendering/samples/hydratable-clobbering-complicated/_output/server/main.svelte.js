import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { hydratable } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var a, b;

		var $$promises = $$renderer.run([
			async () => a = await hydratable('key', () => Promise.resolve({
				nested: Promise.resolve({ one: Promise.resolve(1) }),
				two: Promise.resolve(2)
			})),

			async () => b = await hydratable('key', () => Promise.resolve({
				nested: Promise.resolve({ one: Promise.resolve(2) }),
				two: Promise.resolve(2)
			}))
		]);

		$$renderer.push(`<p>`);
		$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(async () => $.escape((await $.save((await $.save(a.nested))().one))())));
		$$renderer.push(`</p> <p>`);
		$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(async () => $.escape((await $.save(a.two))())));
		$$renderer.push(`</p> <p>`);
		$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(async () => $.escape((await $.save((await $.save(b.nested))().one))())));
		$$renderer.push(`</p> <p>`);
		$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(async () => $.escape((await $.save(b.two))())));
		$$renderer.push(`</p>`);
	});
}