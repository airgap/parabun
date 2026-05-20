import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	var name;
	var $$promises = $$renderer.run([() => Promise.resolve(42), () => ({ name } = $$props)]);

	$$renderer.push(`<!---->`);
	$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(name)));
}