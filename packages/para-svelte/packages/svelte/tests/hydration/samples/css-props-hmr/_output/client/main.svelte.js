import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from "./Component.svelte";

var root = $.from_html(`<svelte-css-wrapper style="display: contents"><!></svelte-css-wrapper>`, 1);

function Main($$anchor) {
	var fragment = root();
	var node = $.first_child(fragment);

	{
		$.css_props(node, () => ({ '--color': 'red' }));
		Component(node.lastChild, {});
		$.reset(node);
	}

	$.append($$anchor, fragment);
}

if (import.meta.hot) {
	Main = $.hmr(Main);

	import.meta.hot.accept((module) => {
		Main[$.HMR].update(module.default);
	});
}

export default Main;