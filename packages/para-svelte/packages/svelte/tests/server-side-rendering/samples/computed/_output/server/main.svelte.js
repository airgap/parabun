import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let a = $$props['a'];
	let b = $$props['b'];

	function c() {
		return a + b;
	}

	function cSquared() {
		return c() * c();
	}

	$$renderer.push(`<p>${$.escape(a)} + ${$.escape(b)} = ${$.escape(c())}</p> <p>${$.escape(c())} * ${$.escape(c())} = ${$.escape(cSquared())}</p>`);
	$.bind_props($$props, { a, b });
}