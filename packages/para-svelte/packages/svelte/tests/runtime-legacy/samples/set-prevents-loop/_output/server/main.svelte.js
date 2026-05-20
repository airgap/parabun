import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';

export default function Main($$renderer, $$props) {
	let visible = $.fallback($$props['visible'], true);
	let answer = $.fallback($$props['answer'], 42);
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		if (visible) {
			$$renderer.push('<!--[0-->');

			Foo($$renderer, {
				get answer() {
					return answer;
				},

				set answer($$value) {
					answer = $$value;
					$$settled = false;
				}
			});
		} else {
			$$renderer.push('<!--[-1-->');

			Foo($$renderer, {
				get answer() {
					return answer;
				},

				set answer($$value) {
					answer = $$value;
					$$settled = false;
				}
			});
		}

		$$renderer.push(`<!--]-->`);
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { visible, answer });
}