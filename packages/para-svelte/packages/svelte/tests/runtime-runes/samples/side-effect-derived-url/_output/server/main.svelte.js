import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import { SvelteURL } from 'svelte/reactivity';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let visibleExternal = false;
			let external = new SvelteURL('https://svelte.dev');

			const throws = $.derived(() => {
				external.host = 'kit.svelte.dev';

				return external;
			});

			let visibleInternal = false;

			const works = $.derived(() => {
				let internal = new SvelteURL('https://svelte.dev');

				internal.host = 'kit.svelte.dev';

				return internal;
			});

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 19, 0);
			$$renderer.push(`external</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (visibleExternal) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`${$.escape(throws())}`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> <button>`);
			$.push_element($$renderer, 'button', 23, 0);
			$$renderer.push(`internal</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (visibleInternal) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`${$.escape(works())}`);
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