import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	function failed($$renderer, error) {
		$$renderer.push(`<p>caught: ${$.escape(error)}</p>`);
	}

	$$renderer.boundary({ failed }, ($$renderer) => {
		$$renderer.push(`<!--[-->`);

		{
			$$renderer.push(`<!---->`);
			$$renderer.push(async () => $.escape(await Promise.reject('catch me')));
		}

		$$renderer.push(`<!--]-->`);
	});
}