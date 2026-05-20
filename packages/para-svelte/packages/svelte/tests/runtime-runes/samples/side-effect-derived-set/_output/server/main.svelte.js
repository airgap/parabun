import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { SvelteSet } from 'svelte/reactivity';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let outside_basic = false;
			let outside_basic_set = new SvelteSet();

			const throws_basic = $.derived(() => {
				outside_basic_set.add(1);

				return outside_basic_set;
			});

			let inside_basic = false;

			const works_basic = $.derived(() => {
				let internal = new SvelteSet();

				internal.add(1);

				return internal;
			});

			let outside_has_delete = false;
			let outside_has_delete_set = new SvelteSet([1]);

			const throws_has_delete = $.derived(() => {
				outside_has_delete_set.has(1);
				outside_has_delete_set.delete(1);

				return outside_has_delete_set;
			});

			let inside_has_delete = false;

			const works_has_delete = $.derived(() => {
				let internal = new SvelteSet([1]);

				internal.has(1);
				internal.delete(1);

				return internal;
			});

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 35, 0);
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
			$.push_element($$renderer, 'button', 39, 0);
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
			$.push_element($$renderer, 'button', 44, 0);
			$$renderer.push(`external</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (outside_has_delete) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`${$.escape(throws_has_delete())}`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> <button>`);
			$.push_element($$renderer, 'button', 48, 0);
			$$renderer.push(`internal</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (inside_has_delete) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`${$.escape(works_has_delete())}`);
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