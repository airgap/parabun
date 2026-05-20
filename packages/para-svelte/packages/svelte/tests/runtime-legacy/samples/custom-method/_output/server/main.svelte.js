import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let counter = $.fallback($$props['counter'], 0);

	function add1() {
		counter += 1;
	}

	function foo() {
		return 42;
	}

	$$renderer.push(`<button>+1</button> <p>${$.escape(counter)}</p>`);
	$.bind_props($$props, { counter, foo });
}