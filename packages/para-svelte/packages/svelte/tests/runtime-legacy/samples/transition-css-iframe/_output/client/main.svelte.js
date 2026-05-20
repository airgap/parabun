import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Frame from './Frame.svelte';
import Foo from './Foo.svelte';

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

	Frame($$anchor, {
		get component() {
			return Foo;
		},

		get visible() {
			return visible();
		}
	});

	return $.pop($$exports);
}