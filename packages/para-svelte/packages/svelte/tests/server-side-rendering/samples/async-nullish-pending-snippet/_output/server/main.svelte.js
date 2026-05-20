import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let pending = null;

	if (pending) {
		$$renderer.push(`<!--[!-->`);
		pending($$renderer);
		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push(`<!--[-->`);

		{
			$$renderer.push(`<!---->`);
			$$renderer.push(async () => $.escape(await 'awaited'));
		}

		$$renderer.push(`<!--]-->`);
	}
}