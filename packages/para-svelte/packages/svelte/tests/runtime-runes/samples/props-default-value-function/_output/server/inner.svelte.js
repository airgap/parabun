import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Inner($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { getter } = $$props;

		$$renderer.push(`<!---->Inner: ${$.escape(getter())}`);
	});
}