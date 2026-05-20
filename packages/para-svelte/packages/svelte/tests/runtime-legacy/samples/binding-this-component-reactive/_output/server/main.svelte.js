import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];

	Foo($$renderer, {});
	$$renderer.push(`<!----> <div>has foo: ${$.escape(!!foo)}</div>`);
	$.bind_props($$props, { foo });
}