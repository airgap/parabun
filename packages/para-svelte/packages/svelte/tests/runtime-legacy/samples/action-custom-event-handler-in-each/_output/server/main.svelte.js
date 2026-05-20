import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let items = $.fallback($$props['items'], () => ['foo', 'bar', 'baz'], true);
	let fromDom = $.fallback($$props['fromDom'], '');
	let fromState = $.fallback($$props['fromState'], '');
	let x = $.fallback($$props['x'], 0);
	let y = $.fallback($$props['y'], 0);

	function tap(node, callback) {
		node.addEventListener('click', callback, false);

		return {
			destroy() {
				node.addEventListener('click', callback, false);
			}
		};
	}

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(items);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		$$renderer.push(`<button>${$.escape(item)}</button>`);
	}

	$$renderer.push(`<!--]--> <p>fromDom: ${$.escape(fromDom)}</p> <p>fromState: ${$.escape(fromState)}</p>`);
	$.bind_props($$props, { items, fromDom, fromState, x, y });
}