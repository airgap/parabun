import * as $ from 'svelte/internal/server';
import { onMount } from 'svelte';
import Two from './Two.svelte';

export default function One($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let snapshot = $$props['snapshot'];
		let foo = $$props['foo'];

		onMount(() => {
			snapshot = foo();
		});

		let $$settled = true;
		let $$inner_renderer;

		function $$render_inner($$renderer) {
			Two($$renderer, {
				get foo() {
					return foo;
				},

				set foo($$value) {
					foo = $$value;
					$$settled = false;
				}
			});
		}

		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);

		$$renderer.subsume($$inner_renderer);
		$.bind_props($$props, { snapshot, foo });
	});
}