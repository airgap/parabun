import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Inner($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { deferred } = $$props;

		function push() {
			const d = Promise.withResolvers();

			deferred.push(() => d.resolve('title'));

			return d.promise;
		}

		$.head('4e8r38', $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>`);
				$$renderer.push(async () => $.escape((await $.save(push()))()));
				$$renderer.push(`</title>`);
			});
		});
	});
}