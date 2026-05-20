import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			class Rect {
				x;
				y;

				constructor(x, y) {
					this.x = x;
					this.y = y;
				}
			}

			class Node {
				pos = { x: 0, y: 0 };
				#rect = $.derived(() => new Rect(this.pos.x, this.pos.y));

				get rect() {
					return this.#rect();
				}

				set rect($$value) {
					return this.#rect($$value);
				}

				constructor(pos) {
					this.pos = pos;
				}
			}

			const nodes = [];
			const rects = $.derived(() => nodes.map((n) => n.rect));

			console.log('$inspect(', rects(), ')');
			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 28, 0);
			$$renderer.push(`add</button>`);
			$.pop_element();
			$$renderer.push(` <ul>`);
			$.push_element($$renderer, 'ul', 31, 0);
			$$renderer.push(`<!--[-->`);

			const each_array = $.ensure_array_like(rects());

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let rect = each_array[$$index];

				$$renderer.push(`<li>`);
				$.push_element($$renderer, 'li', 33, 2);
				$$renderer.push(`${$.escape(rect.x)} - ${$.escape(rect.y)}</li>`);
				$.pop_element();
			}

			$$renderer.push(`<!--]--></ul>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;