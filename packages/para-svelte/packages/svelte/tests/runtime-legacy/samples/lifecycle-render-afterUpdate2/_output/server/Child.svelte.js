import * as $ from 'svelte/internal/server';
import { beforeUpdate, afterUpdate } from "svelte";

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let a = $$props['a'];
		let b = $$props['b'];

		beforeUpdate(() => {
			console.log('before');
		});

		beforeUpdate(() => {
			console.log(`before ${a}, ${b}`);
		});

		afterUpdate(() => {
			console.log('after');
		});

		afterUpdate(() => {
			console.log(`after ${a}, ${b}`);
		});

		$$renderer.push(`<p>a: ${$.escape(a)}</p>`);
		$.bind_props($$props, { a, b });
	});
}