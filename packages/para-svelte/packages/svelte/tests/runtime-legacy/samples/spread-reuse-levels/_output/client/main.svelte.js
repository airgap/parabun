import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12, 1);
	let x = {};

	var $$exports = {
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		}
	};

	Nested($$anchor, $.spread_props(() => x, {
		get a() {
			return a();
		},
		b: [1],
		c: 42
	}));

	return $.pop($$exports);
}