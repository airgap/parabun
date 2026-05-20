import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.push(`<svg>`);

	if (true) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<title>potato</title>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--></svg>`);
}