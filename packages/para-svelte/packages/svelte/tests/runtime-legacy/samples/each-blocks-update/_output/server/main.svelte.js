import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let arr = [1, 2, 3];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(arr);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let n = each_array[$$index];

		$$renderer.push(`<button>${$.escape(n)}</button>`);
	}

	$$renderer.push(`<!--]--> <p>${$.escape(arr.join(', '))}</p>`);
}