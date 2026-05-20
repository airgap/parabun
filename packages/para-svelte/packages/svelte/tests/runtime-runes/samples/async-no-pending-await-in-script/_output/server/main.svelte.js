import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	var $$promises = $$renderer.run([() => 1]);

	if (true) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<p>hello</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
}