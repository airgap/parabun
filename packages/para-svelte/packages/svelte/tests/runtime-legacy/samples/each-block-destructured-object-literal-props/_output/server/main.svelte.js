import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let objectsArray = $$props['objectsArray'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(objectsArray);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let { 0: prop0, "foo-bar": propFooBar, prop: varProp } = each_array[$$index];

		$$renderer.push(`<p>${$.escape(propFooBar)}: ${$.escape(varProp)} ${$.escape(prop0)}</p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { objectsArray });
}