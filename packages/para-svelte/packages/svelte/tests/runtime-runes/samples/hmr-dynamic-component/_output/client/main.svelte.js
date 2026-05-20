import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Component from "./Component.svelte";

var root = $.add_locations($.from_html(`<button>show</button> <!>`, 1), Main[$.FILENAME], [[7, 0]]);

function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let C = $.tag($.state(null), 'C');
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.add_svelte_meta(
		() => $.component(node, () => $.get(C), ($$anchor, C_1) => {
			C_1($$anchor, {});
		}),
		'component',
		Main,
		9,
		0,
		{ componentTag: 'C' }
	);

	$.delegated('click', button, function click() {
		return $.set(C, Component, true);
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