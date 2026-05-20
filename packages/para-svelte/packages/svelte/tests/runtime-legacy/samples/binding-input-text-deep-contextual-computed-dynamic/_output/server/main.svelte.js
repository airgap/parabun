import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let objects = $$props['objects'];
	let prop = $$props['prop'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(objects);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let obj = each_array[$$index];

		$$renderer.push(`<input${$.attr('value', obj[prop])}/> <pre>${$.escape(JSON.stringify(obj))}</pre>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { objects, prop });
}