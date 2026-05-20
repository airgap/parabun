import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	let name = $$props['name'];
	var answer = 42; // foo.js

	console.log(answer); // bar.js

	var answer2 = 84; // foo2.js

	console.log(answer2); // bar2.js
	$$renderer.push(`<h1>sourcemap-sources ${$.escape(name)}</h1>`);
	$.bind_props($$props, { name });
}