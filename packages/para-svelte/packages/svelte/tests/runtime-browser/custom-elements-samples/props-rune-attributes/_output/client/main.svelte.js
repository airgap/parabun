import 'svelte/internal/disclose-version';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <p> </p> <p> </p>`, 1);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, true);

	let bar = $.prop($$props, 'bar', 7),
		baz = $.prop($$props, 'b-az', 7),
		rest = $.rest_props($$props, ['$$slots', '$$events', '$$legacy', '$$host', 'bar', 'b-az']);

	var $$exports = {
		get bar() {
			return bar();
		},

		set bar($$value) {
			bar($$value);
			$.flush();
		},

		get 'b-az'() {
			return baz();
		},

		set 'b-az'($$value) {
			baz($$value);
			$.flush();
		}
	};

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1, true);

	$.reset(p_1);

	var p_2 = $.sibling(p_1, 2);
	var text_2 = $.child(p_2, true);

	$.reset(p_2);

	$.template_effect(() => {
		$.set_text(text, $$props.foo);
		$.set_text(text_1, bar());
		$.set_text(text_2, baz());
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

customElements.define('custom-element', $.create_custom_element(_unknown_, { foo: { attribute: 'foo-bar' }, bar: {}, 'b-az': {} }, [], [], { mode: 'open' }));