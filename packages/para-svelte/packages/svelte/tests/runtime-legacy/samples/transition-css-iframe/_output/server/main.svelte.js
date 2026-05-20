import * as $ from 'svelte/internal/server';
import Frame from './Frame.svelte';
import Foo from './Foo.svelte';

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];

	Frame($$renderer, { component: Foo, visible });
	$.bind_props($$props, { visible });
}