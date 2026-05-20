import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { foo } from './Foo.svelte';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let bar = $.prop($$props, 'bar', 12, 99);

	var $$exports = {
		get bar() {
			return bar();
		},

		set bar($$value) {
			bar($$value);
			$.flush();
		}
	};

	$.init();

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(($0) => $.set_text(text, `(${$0 ?? ''})(${bar() ?? ''})`), [() => ($.deep_read_state(foo), $.untrack(foo))]);
	$.append($$anchor, p);

	return $.pop($$exports);
}