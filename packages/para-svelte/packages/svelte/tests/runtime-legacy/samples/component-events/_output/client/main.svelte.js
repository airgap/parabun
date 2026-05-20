import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { createEventDispatcher } from 'svelte';
import Widget from './Widget.svelte';

var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const dispatch = createEventDispatcher();
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

	$.init();

	var div = root();
	var node = $.child(div);

	{
		var consequent = ($$anchor) => {
			Widget($$anchor, { $$events: { destroy: () => dispatch("widgetTornDown") } });
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}