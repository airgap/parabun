import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Red from "./Red.svelte";
import Blue from "./Blue.svelte";

var root = $.add_locations($.from_html(`<main><button>toggle</button> <!></main>`), Main[$.FILENAME], [[11, 0, [[12, 2]]]]);

function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	const comps = { Red, Blue };
	let activeComp = $.tag($.state("Red"), 'activeComp');
	var $$exports = { ...$.legacy_api() };
	var main = root();
	var button = $.child(main);
	var node = $.sibling(button, 2);

	$.add_svelte_meta(
		() => $.component(node, () => comps[$.get(activeComp)], ($$anchor, $$component) => {
			$$component($$anchor, {});
		}),
		'component',
		Main,
		13,
		2,
		{ componentTag: 'svelte:component' }
	);

	$.reset(main);

	$.delegated('click', button, function click() {
		return $.set(activeComp, $.strict_equals($.get(activeComp), "Red") ? "Blue" : "Red", true);
	});

	$.append($$anchor, main);

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