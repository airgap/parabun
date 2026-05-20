import 'svelte/internal/flags/async';

Passthrough[$.FILENAME] = 'passthrough.svelte';

import * as $ from 'svelte/internal/server';

function Passthrough($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { children, named } = $$props;

			children?.($$renderer);
			$$renderer.push(`<!----> `);

			if (true) {
				$$renderer.push('<!--[0-->');
				named?.($$renderer);
				$$renderer.push(`<!---->`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]-->`);
		},
		Passthrough
	);
}

Passthrough.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Passthrough;