import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

function foo($$renderer) {
	let x;
	var promises = $$renderer.run([async () => x = (await $.save('this should work'))()]);

	$$renderer.push(`<div>`);
	$$renderer.async([promises[0]], ($$renderer) => $$renderer.push(() => $.escape(x)));
	$$renderer.push(`</div>`);
}

export default function Main($$renderer) {
	foo($$renderer);
}