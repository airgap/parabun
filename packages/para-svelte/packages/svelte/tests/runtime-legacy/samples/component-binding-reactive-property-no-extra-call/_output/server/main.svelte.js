import * as $ from 'svelte/internal/server';
import Component from './Component.svelte';

export default function Main($$renderer, $$props) {
	let primitive_updates = $.fallback($$props['primitive_updates'], 0);
	let object_updates = $.fallback($$props['object_updates'], 0);
	const obj = { foo: '' };
	let foo = 'bar';

	$effect: if (obj) object_updates++;
	$effect: if (foo) primitive_updates++;

	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		Component($$renderer, {
			get value() {
				return obj.foo;
			},

			set value($$value) {
				obj.foo = $$value;
				$$settled = false;
			},

			get value2() {
				return foo;
			},

			set value2($$value) {
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
	$.bind_props($$props, { primitive_updates, object_updates });
}