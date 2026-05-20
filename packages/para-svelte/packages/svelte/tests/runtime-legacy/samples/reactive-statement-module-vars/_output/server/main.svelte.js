import * as $ from 'svelte/internal/server';

let moduleA = 'moduleA';
let moduleB = 'moduleB';

export default function Main($$renderer, $$props) {
	let a, b;

	function updateModuleA() {
		moduleA = 'something else';
	}

	function reset() {
		moduleA = 'moduleA';
	}

	$: a = moduleA;
	$: b = moduleB;

	$$renderer.push(`<!---->a: ${$.escape(a)}
b: ${$.escape(b)}
moduleA: ${$.escape(moduleA)}
moduleB: moduleB`);

	$.bind_props($$props, { updateModuleA, reset });
}