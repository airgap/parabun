import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let clicked = $.fallback($$props['clicked'], null);

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(['racoon', 'eagle']);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let animal = each_array[$$index];

		$$renderer.push(`<button>${$.escape(animal)}</button>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { clicked });
}