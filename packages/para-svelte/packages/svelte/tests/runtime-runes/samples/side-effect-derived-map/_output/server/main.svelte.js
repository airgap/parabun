import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { SvelteMap } from 'svelte/reactivity';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let outside_basic = false;
			let outside_basic_map = new SvelteMap();

			const throw_basic = $.derived(() => {
				outside_basic_map.set(1, 1);

				return outside_basic_map;
			});

			let inside_basic = false;

			const works_basic = $.derived(() => {
				let inside = new SvelteMap();

				inside.set(1, 1);

				return inside;
			});

			let outside_has = false;
			let outside_has_map = new SvelteMap([[1, 1]]);

			const throw_has = $.derived(() => {
				outside_has_map.has(1);
				outside_has_map.set(1, 2);

				return outside_has_map;
			});

			let inside_has = false;

			const works_has = $.derived(() => {
				let inside = new SvelteMap([[1, 1]]);

				inside.has(1);
				inside.set(1, 1);

				return inside;
			});

			let outside_get = false;
			let outside_get_map = new SvelteMap([[1, 1]]);

			const throw_get = $.derived(() => {
				outside_get_map.get(1);
				outside_get_map.set(1, 2);

				return outside_get_map;
			});

			let inside_get = false;

			const works_get = $.derived(() => {
				let inside = new SvelteMap([[1, 1]]);

				inside.get(1);
				inside.set(1, 1);

				return inside;
			});

			let outside_values = false;
			let outside_values_map = new SvelteMap([[1, 1]]);

			const throw_values = $.derived(() => {
				outside_values_map.values(1);
				outside_values_map.set(1, 2);

				return outside_values_map;
			});

			let inside_values = false;

			const works_values = $.derived(() => {
				let inside = new SvelteMap([[1, 1]]);

				inside.values();
				inside.set(1, 1);

				return inside;
			});

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 67, 0);
			$$renderer.push(`external</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (outside_basic) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`${$.escape(throw_basic())}`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> <button>`);
			$.push_element($$renderer, 'button', 71, 0);
			$$renderer.push(`internal</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (inside_basic) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`${$.escape(works_basic())}`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> <button>`);
			$.push_element($$renderer, 'button', 76, 0);
			$$renderer.push(`external</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (outside_has) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`${$.escape(throw_has())}`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> <button>`);
			$.push_element($$renderer, 'button', 80, 0);
			$$renderer.push(`internal</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (inside_has) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`${$.escape(works_has())}`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> <button>`);
			$.push_element($$renderer, 'button', 85, 0);
			$$renderer.push(`external</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (outside_get) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`${$.escape(throw_get())}`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> <button>`);
			$.push_element($$renderer, 'button', 89, 0);
			$$renderer.push(`internal</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (inside_get) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`${$.escape(works_get())}`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> <button>`);
			$.push_element($$renderer, 'button', 94, 0);
			$$renderer.push(`external</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (outside_values) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`${$.escape(throw_values())}`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> <button>`);
			$.push_element($$renderer, 'button', 98, 0);
			$$renderer.push(`internal</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (inside_values) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`${$.escape(works_values())}`);
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