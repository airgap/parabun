import * as $ from 'svelte/internal/server';
import Sub from './Sub.svelte';

export default function Main($$renderer, $$props) {
	let selected = $$props['selected'];
	let banana = {};
	let component = banana;

	$: selected ? component = Sub : component = banana;

	if (component) {
		$$renderer.push('<!--[-->');
		component($$renderer, {});
		$$renderer.push('<!--]-->');
	} else {
		$$renderer.push('<!--[!-->');
		$$renderer.push('<!--]-->');
	}

	$.bind_props($$props, { selected });
}