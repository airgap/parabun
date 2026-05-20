import * as $ from 'svelte/internal/server';
import { onMount } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let things = $$props['things'];
		let visible = $$props['visible'];
		let intros = $.fallback($$props['intros'], () => [], true);
		let outros = $.fallback($$props['outros'], () => [], true);
		let intro_count = $.fallback($$props['intro_count'], 0);
		let outro_count = $.fallback($$props['outro_count'], 0);
		let status = 'waiting...';

		function foo(node, params) {
			return {
				duration: 100,
				tick: (t) => {
					node.foo = t;
				}
			};
		}

		function introstart(e) {
			intros.push(e.target.textContent);
			intro_count += 1;
			status = 'introstart';
		}

		function introend(e) {
			intro_count -= 1;
			status = 'introend';
		}

		function outrostart(e) {
			outros.push(e.target.textContent);
			outro_count += 1;
			status = 'outrostart';
		}

		function outroend(e) {
			outro_count -= 1;
			status = 'outroend';
		}

		$$renderer.push(`<p>${$.escape(status)}</p> <!--[-->`);

		const each_array = $.ensure_array_like(things);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let thing = each_array[$$index];

			if (visible) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`<p>${$.escape(thing)}</p>`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]-->`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { things, visible, intros, outros, intro_count, outro_count });
	});
}