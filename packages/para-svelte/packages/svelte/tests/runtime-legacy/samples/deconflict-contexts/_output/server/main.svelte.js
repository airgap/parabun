import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let components = $$props['components'];

	$$renderer.push(`<ul><!--[-->`);

	const each_array = $.ensure_array_like(components);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let component = each_array[$$index];

		$$renderer.push(`<li>${$.escape(component)}</li>`);
	}

	$$renderer.push(`<!--]--></ul>`);
	$.bind_props($$props, { components });
}