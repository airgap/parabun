import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`before <!> after`, 1);

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

	$.next();

	var fragment = root();
	var node = $.sibling($.first_child(fragment));

	{
		var consequent = ($$anchor) => {
			Widget($$anchor, {});
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.next();
	$.append($$anchor, fragment);

	return $.pop($$exports);
}