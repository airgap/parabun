import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let components = $$props['components'];
	let name;

	$$renderer.push(`<ul><!--[-->`);

	const each_array = $.ensure_array_like(components);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let component = each_array[$$index];

		$$renderer.push(`<li>`);

		if (component.edit) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<input${$.attr('value', component.name)}/>`);
		} else {
			$$renderer.push('<!--[-1-->');
			$$renderer.push(`${$.escape(component.name)}`);
		}

		$$renderer.push(`<!--]--></li>`);
	}

	$$renderer.push(`<!--]--></ul>`);
	$.bind_props($$props, { components });
}