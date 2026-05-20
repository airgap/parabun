import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';

export default function Main($$renderer, $$props) {
	let Bar = $.fallback($$props['Bar'], Foo);

	if (Bar) {
		$$renderer.push('<!--[-->');
		Bar($$renderer, {});
		$$renderer.push('<!--]-->');
	} else {
		$$renderer.push('<!--[!-->');
		$$renderer.push('<!--]-->');
	}

	$.bind_props($$props, { Bar });
}