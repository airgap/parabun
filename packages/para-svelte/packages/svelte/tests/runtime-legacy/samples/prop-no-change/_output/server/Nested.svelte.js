import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	let primitive = $$props['primitive'];
	let object = $$props['object'];

	$: primitive && console.log('primitive');
	$: object && console.log('object');

	$.bind_props($$props, { primitive, object });
}