import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { Tween } from 'svelte/motion';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let outside_basic = false;
			let outside_basic_tween = new Tween(0);

			const throws_basic = $.derived(() => {
				outside_basic_tween.set(1);

				return outside_basic_tween;
			});

			let inside_basic = false;

			const works_basic = $.derived(() => {
				let internal = new Tween(0);

				internal.set(1);

				return internal;
			});

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 19, 0);
			$$renderer.push(`external</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (outside_basic) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`${$.escape(throws_basic())}`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> <button>`);
			$.push_element($$renderer, 'button', 23, 0);
			$$renderer.push(`internal</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (inside_basic) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`${$.escape(works_basic())}`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]-->`);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;