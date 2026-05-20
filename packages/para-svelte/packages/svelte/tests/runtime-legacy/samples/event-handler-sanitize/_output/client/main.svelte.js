import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from "./Component.svelte";

var root_1 = $.from_html(`<p>hello!</p>`);
var root = $.from_html(`<div>toggle</div> <!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12);

	var $$exports = {
		get visible() {
			return visible();
		},

		set visible($$value) {
			visible($$value);
			$.flush();
		}
	};

	var fragment = root();
	var div = $.first_child(fragment);
	var node = $.sibling(div, 2);

	Component(node, { $$events: { 'event-name': () => visible(!visible()) } });

	var node_1 = $.sibling(node, 2);

	{
		var consequent = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.if(node_1, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.event('some-event', div, () => visible(!visible()));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}