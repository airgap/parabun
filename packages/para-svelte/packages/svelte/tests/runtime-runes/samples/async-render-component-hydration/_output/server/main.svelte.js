import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Image from "./Image.svelte";
import Link from "./Link.svelte";

export default function Main($$renderer) {
	var url;

	var $$promises = $$renderer.run([
		async () => url = await $.async_derived(() => 'https://svelte.dev')
	]);

	Link($$renderer, {
		children: ($$renderer) => {
			$$renderer.push(`<div>card</div> `);

			$$renderer.async_block([$$promises[0]], ($$renderer) => {
				Image($$renderer, { src: url() });
			});
		},
		$$slots: { default: true }
	});
}