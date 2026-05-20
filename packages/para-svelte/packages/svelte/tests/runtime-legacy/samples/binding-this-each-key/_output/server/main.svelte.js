import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let // note that this is NOT data.slice().reverse()
		// as that wouldn't have triggered an infinite loop
		list;

		let data = $.fallback($$props['data'], () => [{ id: '1' }, { id: '2' }, { id: '3' }], true);
		let refs = $.fallback($$props['refs'], () => [], true);

		$: list = data.reverse();

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(list);

		for (let index = 0, $$length = each_array.length; index < $$length; index++) {
			let { id } = each_array[index];

			$$renderer.push(`<div>content ${$.escape(index)} ${$.escape(id)} ${$.escape(data[index].id)}</div>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { data, refs });
	});
}