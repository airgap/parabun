import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { SvelteSet } from 'svelte/reactivity';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			function* generator() {
				yield 1;
			}

			let gen = new SvelteSet(generator());

			$$renderer.push(`<!--[-->`);

			const each_array = $.ensure_array_like(gen);

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let item = each_array[$$index];

				$$renderer.push(`<!---->${$.escape(item)}`);
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