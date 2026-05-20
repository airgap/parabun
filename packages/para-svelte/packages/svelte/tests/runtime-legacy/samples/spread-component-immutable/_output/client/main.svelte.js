import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let obj = $.prop($$props, 'obj', 12);

	var $$exports = {
		get obj() {
			return obj();
		},

		set obj($$value) {
			obj($$value);
			$.flush();
		}
	};

	Widget($$anchor, $.spread_props(obj, { x: 2 }));

	return $.pop($$exports);
}