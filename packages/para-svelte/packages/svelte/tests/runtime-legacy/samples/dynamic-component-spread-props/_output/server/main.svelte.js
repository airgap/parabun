import * as $ from 'svelte/internal/server';
import Comp1 from './Comp1.svelte';
import Comp2 from './Comp2.svelte';

export default function Main($$renderer) {
	let props;
	let view = Comp1;
	const bar = "bar";

	function cb() {}

	$: props = view === Comp1 ? { value: 1 } : { value: 2 };

	if (view) {
		$$renderer.push('<!--[-->');
		view($$renderer, $.spread_props([props, { foo: bar, cb }]));
		$$renderer.push('<!--]-->');
	} else {
		$$renderer.push('<!--[!-->');
		$$renderer.push('<!--]-->');
	}

	$$renderer.push(` <button>Toggle Component</button>`);
}