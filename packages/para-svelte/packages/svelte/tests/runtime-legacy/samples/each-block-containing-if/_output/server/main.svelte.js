import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let items = $.fallback(
		$$props['items'],
		() => [
			{ description: 'one', completed: false },
			{ description: 'two', completed: false },
			{ description: 'three', completed: false }
		],
		true
	);

	let currentFilter = $.fallback($$props['currentFilter'], 'completed');

	function filter(item, currentFilter) {
		if (currentFilter === 'all') return true;
		if (currentFilter === 'completed') return item.completed;
		if (currentFilter === 'active') return !item.completed;
	}

	$$renderer.push(`<ul><!--[-->`);

	const each_array = $.ensure_array_like(items);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		if (filter(item, currentFilter)) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<li>${$.escape(item.description)}</li>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]--></ul>`);
	$.bind_props($$props, { items, currentFilter });
}