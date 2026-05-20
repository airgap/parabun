import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1 class="svelte-1q9dax5">Hello</h1>`);

function Component($$anchor) {
	var h1 = root();

	$.append($$anchor, h1);
}

if (import.meta.hot) {
	Component = $.hmr(Component);

	import.meta.hot.accept((module) => {
		$.cleanup_styles('svelte-1q9dax5');
		Component[$.HMR].update(module.default);
	});
}

export default Component;