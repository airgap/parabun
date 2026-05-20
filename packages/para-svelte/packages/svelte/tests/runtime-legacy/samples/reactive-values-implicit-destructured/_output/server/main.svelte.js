import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x, y, answer;
	let coords = $$props['coords'];
	let numbers = $$props['numbers'];

	$: [x, y] = coords;
	$: ({ answer } = numbers);

	$$renderer.push(`<p>${$.escape(x)},${$.escape(y)}</p> <p>${$.escape(answer)}</p>`);
	$.bind_props($$props, { coords, numbers });
}