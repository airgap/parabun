import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Component from "./component.svelte";

export default function Main($$renderer) {
	Component($$renderer, {
		children: ($$renderer) => {
			let one;
			var promises = $$renderer.run([async () => one = (await $.save(1))()]);

			$$renderer.push(`<!---->`);
			$$renderer.async([promises[0]], ($$renderer) => $$renderer.push(() => $.escape(one)));
		},
		$$slots: { default: true }
	});
}