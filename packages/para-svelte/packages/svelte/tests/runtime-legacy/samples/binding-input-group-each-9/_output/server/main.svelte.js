import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let list = $.fallback(
			$$props['list'],
			() => [
				{ name: "a", text: "This is a test." },
				{ name: "b", text: "This is another test." },
				{ name: "c", text: "This is also a test." }
			],
			true
		);

		let current = $.fallback($$props['current'], "a");

		function moveUp(i) {
			list = [
				...list.slice(0, Math.max(i - 1, 0)),
				list[i],
				list[i - 1],
				...list.slice(i + 1)
			];
		}

		function moveDown(i) {
			moveUp(i + 1);
		}

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(list);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];

			$$renderer.push(`<div class="item">${$.escape(item.name)} `);

			if (true) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`<label><input type="radio" name="current"${$.attr('checked', current === item.name, true)}${$.attr('value', item.name)}/> current</label>`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--></div>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { list, current, moveUp, moveDown });
	});
}