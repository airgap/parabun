import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let _x;

	function getX() {
		return _x;
	}

	let y = $.fallback($$props['y'], 1);
	let xGetter;
	let x = $$props['x'];

	$: {
		_x = y * 2;
		xGetter = getX;
	}

	$: x = xGetter();

	$$renderer.push(`<p>${$.escape(x)}</p>`);
	$.bind_props($$props, { y, x });
}