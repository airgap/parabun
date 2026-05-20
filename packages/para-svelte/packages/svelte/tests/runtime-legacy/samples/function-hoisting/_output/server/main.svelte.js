import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let greeting = $.fallback($$props['greeting'], 'Hello');
	let name = 'world';

	// both functions, and `name` are hoistable, but hoistMe does not get hoisted
	function hoistMeMaybe() {
		return hoistMe(name); // comment out this line => hoistMe is hoisted
	}

	function hoistMe(name) {
		return name;
	}

	$$renderer.push(`<h1>${$.escape(greeting)}, ${$.escape(hoistMeMaybe())}</h1>`);
	$.bind_props($$props, { greeting });
}