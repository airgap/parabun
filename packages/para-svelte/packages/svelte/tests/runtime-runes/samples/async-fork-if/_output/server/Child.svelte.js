import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	let { x } = $$props;

	console.log(x);

	var $$promises = $$renderer.run([() => Promise.resolve(), () => void console.log(x)]);

	$$renderer.push(`<!---->`);
	$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(x)));
}