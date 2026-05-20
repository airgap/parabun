import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { untrack } from 'svelte';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let a = 1;
			let b = 2;
			let c = 3;

			async function a_plus_b_plus_c() {
				return await a + await b + await untrack(() => c);
			}

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 12, 0);
			$$renderer.push(`a</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 13, 0);
			$$renderer.push(`b</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 14, 0);
			$$renderer.push(`c</button>`);
			$.pop_element();
			$$renderer.push(` `);
			$$renderer.push(`<!--[!-->`);

			{
				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 21, 2);
				$$renderer.push(`pending</p>`);
				$.pop_element();
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