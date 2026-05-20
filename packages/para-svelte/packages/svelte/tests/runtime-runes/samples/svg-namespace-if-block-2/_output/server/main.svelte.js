import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.push(`<svg>`);

	if (true) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<a href="/docs"><text x="20" y="40" class="small">${$.escape(name)}</text></a>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--></svg>`);
}