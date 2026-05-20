import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let a = 1;
	let b = 2;
	let c = 3;

	$$renderer.push(`<div${$.attr_class(`${$.stringify(a)}${$.stringify(b)}${$.stringify(c)}`)}></div> <img${$.attr('src', `${$.stringify(a)}${$.stringify(b)} hello, world ${$.stringify(a)}${$.stringify(c)}`)}/>`);
}