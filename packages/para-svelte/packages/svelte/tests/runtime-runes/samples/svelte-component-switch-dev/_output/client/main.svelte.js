import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import A from './A.svelte';
import B from './B.svelte';

var root = $.add_locations($.from_html(`<button>switch</button> <!>`, 1), Main[$.FILENAME], [[8, 0]]);

function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let component = $.tag($.state($.proxy(A)), 'component');
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.add_svelte_meta(
		() => $.component(node, () => $.get(component), ($$anchor, $$component) => {
			$$component($$anchor, {});
		}),
		'component',
		Main,
		9,
		0,
		{ componentTag: 'svelte:component' }
	);

	$.delegated('click', button, function click() {
		return $.set(component, B, true);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

if (import.meta.hot) {
	Main = $.hmr(Main);

	import.meta.hot.accept((module) => {
		Main[$.HMR].update(module.default);
	});
}

export default Main;

$.delegate(['click']);