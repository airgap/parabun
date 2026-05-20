import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	function updateFoo(value) {
		foo(value);
	}

	let foo = $.prop($$props, 'foo', 12);

	var $$exports = {
		updateFoo,
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, foo()));
	$.append($$anchor, p);
	$.bind_prop($$props, 'updateFoo', updateFoo);

	return $.pop($$exports);
}

customElements.define('custom-element', $.create_custom_element(_unknown_, { foo: {} }, [], ['updateFoo'], { mode: 'open' }, (CeClass) => {
	return class extends CeClass {
		updateFoo(value) {
			this.foo = value;
		}
	};
}));