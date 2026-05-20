import * as $ from 'svelte/internal/server';
import Thing from './Thing.svelte';

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];
	let empty = $$props['empty'];

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div><!--[-->`);

		const each_array = $.ensure_array_like(empty);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let thing = each_array[$$index];

			Thing($$renderer, { thing });
		}

		$$renderer.push(`<!--]--> <p>text</p></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible, empty });
}