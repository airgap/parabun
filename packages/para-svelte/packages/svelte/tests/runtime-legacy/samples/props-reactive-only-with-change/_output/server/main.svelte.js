import * as $ from 'svelte/internal/server';
import Comp from './Comp.svelte';

export default function Main($$renderer, $$props) {
	let callback = $$props['callback'];
	let val1 = $$props['val1'];
	let val2 = $$props['val2'];

	Comp($$renderer, { id: '1', callback, value: val1 });
	$$renderer.push(`<!----> `);
	Comp($$renderer, { id: '2', callback, value: val2 });
	$$renderer.push(`<!---->`);
	$.bind_props($$props, { callback, val1, val2 });
}