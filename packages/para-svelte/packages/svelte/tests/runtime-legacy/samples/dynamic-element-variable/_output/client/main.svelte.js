import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let tag = $.prop($$props, 'tag', 12, "div");
	let text = $.prop($$props, 'text', 12, "Foo");

	var $$exports = {
		get tag() {
			return tag();
		},

		set tag($$value) {
			tag($$value);
			$.flush();
		},

		get text() {
			return text();
		},

		set text($$value) {
			text($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.element(node, tag, false, ($$element, $$anchor) => {
		var text_1 = $.text();

		$.template_effect(() => $.set_text(text_1, text()));
		$.append($$anchor, text_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}