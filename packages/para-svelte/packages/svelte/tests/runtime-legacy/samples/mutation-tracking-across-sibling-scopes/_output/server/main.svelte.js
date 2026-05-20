import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const things = [{ ok: true }, { ok: false }];
	let div = $$props['div'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(things);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let thing = each_array[$$index];

		$$renderer.push(`<div><input type="checkbox"${$.attr('checked', thing.ok, true)}/></div>`);
	}

	$$renderer.push(`<!--]--> <div><!--[-->`);

	const each_array_1 = $.ensure_array_like(things);

	for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
		let other = each_array_1[$$index_1];

		$$renderer.push(`<div>${$.escape(other.ok ? '+' : '-')}</div>`);
	}

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { div });
}