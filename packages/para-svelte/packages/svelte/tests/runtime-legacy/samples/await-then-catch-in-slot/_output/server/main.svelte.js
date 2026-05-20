import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';

export default function Main($$renderer, $$props) {
	let thePromise = $$props['thePromise'];

	Foo($$renderer, {
		children: ($$renderer) => {
			$.await(
				$$renderer,
				thePromise,
				() => {
					$$renderer.push(`<p>loading...</p>`);
				},
				(theValue) => {
					$$renderer.push(`<p>the value is ${$.escape(theValue)}</p>`);
				}
			);

			$$renderer.push(`<!--]-->`);
		},
		$$slots: { default: true }
	});

	$.bind_props($$props, { thePromise });
}