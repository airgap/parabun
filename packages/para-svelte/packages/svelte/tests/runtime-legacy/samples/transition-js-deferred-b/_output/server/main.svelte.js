import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let visible = $$props['visible'];
		let foo_text;
		let bar_text;

		function foo(node, { duration = 100 }) {
			foo_text = node.textContent;

			return () => {
				if (bar_text !== `b`) {
					throw new Error(`foo ran prematurely`);
				}

				return {
					duration,
					tick: (t) => {
						node.foo = t;
					}
				};
			};
		}

		function bar(node, { duration = 100 }) {
			bar_text = node.textContent;

			return () => {
				if (foo_text !== `a`) {
					throw new Error(`bar ran prematurely`);
				}

				return {
					duration,
					tick: (t) => {
						node.foo = t;
					}
				};
			};
		}

		if (visible) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<div class="foo">a</div>`);
		} else {
			$$renderer.push('<!--[-1-->');
			$$renderer.push(`<div>b</div>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { visible });
	});
}