import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let keys = ["foo", "bar"];
	let values = [1, 2, 3];
	let object = {};

	// Make sure Svelte has an array to bind to
	function update() {
		keys = ["qux"];
		values = [4, 5, 6];
	}

	$: keys.forEach((key) => {
		// Make sure Svelte has an array to bind to
		if (!object[key]) {
			object[key] = [];
		}
	});

	$$renderer.push(`<p>${$.escape(JSON.stringify(object))}</p> <!--[-->`);

	const each_array = $.ensure_array_like(keys);

	for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
		let key = each_array[$$index_1];

		$$renderer.push(`<h2>${$.escape(key)}</h2> <ul><!--[-->`);

		const each_array_1 = $.ensure_array_like(values);

		for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
			let value = each_array_1[$$index];

			$$renderer.push(`<li><label><input type="checkbox"${$.attr('name', key)}${$.attr('value', value)}${$.attr('checked', object[key].includes(value), true)}/> ${$.escape(value)}</label></li>`);
		}

		$$renderer.push(`<!--]--></ul>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { update });
}