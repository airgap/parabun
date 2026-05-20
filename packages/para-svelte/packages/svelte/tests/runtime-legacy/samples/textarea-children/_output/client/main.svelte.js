import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<textarea></textarea>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	var textarea = root();

	$.remove_textarea_child(textarea);

	$.template_effect(() => $.set_value(textarea, `	<p>not actually an element. ${foo() ?? ''}</p>
`));

	$.append($$anchor, textarea);

	return $.pop($$exports);
}