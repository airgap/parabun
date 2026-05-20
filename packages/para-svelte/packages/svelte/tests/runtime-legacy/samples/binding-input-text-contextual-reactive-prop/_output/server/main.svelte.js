import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let done, remaining, filtered, summary;
		let items = $$props['items'];
		let filter = $.fallback($$props['filter'], 'all');

		$: done = items.filter((item) => item.done);
		$: remaining = items.filter((item) => !item.done);
		$: filtered = filter === 'all' ? items : filter === 'done' ? done : remaining;
		$: summary = items.map((i) => `${i.done ? 'done' : 'remaining'}:${i.text}`).join(' / ');

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(filtered);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];

			$$renderer.push(`<div><input type="checkbox"${$.attr('checked', item.done, true)}/> <input type="text"${$.attr('value', item.text)}/> <p>${$.escape(item.text)}</p></div>`);
		}

		$$renderer.push(`<!--]--> <p>${$.escape(summary)}</p>`);
		$.bind_props($$props, { items, filter });
	});
}