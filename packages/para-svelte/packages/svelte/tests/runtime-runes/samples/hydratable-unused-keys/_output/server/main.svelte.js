import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { hydratable } from "svelte";

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { environment } = $$props;

		const unresolved_hydratable = hydratable("unused_key", () => new Promise((res, rej) => environment === 'server'
			? setTimeout(() => res('did you ever hear the tragedy of darth plagueis the wise?'), 0)
			: rej('should not run')));

		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<div>Loading...</div>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}