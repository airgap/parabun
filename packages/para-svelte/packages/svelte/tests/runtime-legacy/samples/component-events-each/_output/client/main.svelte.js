import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';
import { createEventDispatcher } from 'svelte';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const dispatch = createEventDispatcher();
	let items = $.prop($$props, 'items', 12);

	function foo(item) {
		dispatch('foo', item);
	}

	var $$exports = {
		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		}
	};

	$.init();

	var div = root();

	$.each(div, 5, items, $.index, ($$anchor, item) => {
		Widget($$anchor, { $$events: { foo: () => foo($.get(item)) } });
	});

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}