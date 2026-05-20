import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let items = $.fallback($$props['items'], () => [[0, 'foo'], [1, 'bar'], [2, 'baz']], true);
	let first = $.fallback($$props['first'], '');
	let second = $.fallback($$props['second'], '');
	let x = $.fallback($$props['x'], 0);
	let y = $.fallback($$props['y'], 0);

	function tap(node, callback) {
		function clickHandler(event) {
			callback();
		}

		node.addEventListener('click', clickHandler, false);

		return {
			destroy() {
				node.addEventListener('click', clickHandler, false);
			}
		};
	}

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(items);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let [item0, item1] = each_array[$$index];

		$$renderer.push(`<button>${$.escape(item0)}: ${$.escape(item1)}</button>`);
	}

	$$renderer.push(`<!--]--> <p>first: ${$.escape(first)}</p> <p>second: ${$.escape(second)}</p>`);
	$.bind_props($$props, { items, first, second, x, y });
}