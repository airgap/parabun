import * as $ from 'svelte/internal/server';
import Child from "./Child.svelte";

export default function Main($$renderer) {
	let x;

	$: if (!x) x = { y: 0 };

	Child($$renderer, { x: x ?? {} });
	$$renderer.push(`<!----> parent: ${$.escape(x.y)} <button>inc x</button>`);
}