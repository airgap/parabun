import * as $ from 'svelte/internal/server';
import Comp1 from './Comp1.svelte';
import Comp2 from './Comp2.svelte';

export default function Main($$renderer, $$props) {
	let n = $.fallback($$props['n'], 0);
	let view = { comp: Comp1, fn: () => ++n };

	if (view.comp) {
		$$renderer.push('<!--[-->');
		view.comp($$renderer, { value: view.fn() });
		$$renderer.push('<!--]-->');
	} else {
		$$renderer.push('<!--[!-->');
		$$renderer.push('<!--]-->');
	}

	$$renderer.push(` <button>Toggle Component</button>`);
	$.bind_props($$props, { n });
}