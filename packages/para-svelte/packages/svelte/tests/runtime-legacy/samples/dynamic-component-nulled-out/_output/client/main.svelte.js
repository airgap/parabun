import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let Bar = $.prop($$props, 'Bar', 12, Foo);

	var $$exports = {
		get Bar() {
			return Bar();
		},

		set Bar($$value) {
			Bar($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.component(node, Bar, ($$anchor, $$component) => {
		$$component($$anchor, {});
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}