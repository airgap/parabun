import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let value = { id: '0' };
		const resolvers = [];

		function wait() {
			const promise = Promise.withResolvers();

			resolvers.push(promise.resolve);

			return promise.promise;
		}

		function spam() {
			value.id = `${Number(value.id) + 1}`;
		}

		$$renderer.push(`<button class="spam">Spam</button> <button class="resolve">Resolve</button> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>pending</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}