import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<h1> </h1> <!>`, 1);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let camelCase = $.prop($$props, 'camelCase', 12);
	let camelCase2 = $.prop($$props, 'camelCase2', 12);
	let anArray = $.prop($$props, 'anArray', 12);

	var $$exports = {
		get camelCase() {
			return camelCase();
		},

		set camelCase($$value) {
			camelCase($$value);
			$.flush();
		},

		get camelCase2() {
			return camelCase2();
		},

		set camelCase2($$value) {
			camelCase2($$value);
			$.flush();
		},

		get anArray() {
			return anArray();
		},

		set anArray($$value) {
			anArray($$value);
			$.flush();
		}
	};

	var fragment = root();
	var h1 = $.first_child(fragment);
	var text = $.child(h1);

	$.reset(h1);

	var node = $.sibling(h1, 2);

	$.each(node, 1, anArray, $.index, ($$anchor, item) => {
		var p = root_1();
		var text_1 = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text_1, $.get(item)));
		$.append($$anchor, p);
	});

	$.template_effect(() => $.set_text(text, `${camelCase2() ?? ''} ${camelCase() ?? ''}!`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}

customElements.define('custom-element', $.create_custom_element(
	_unknown_,
	{
		camelCase: { attribute: 'camel-case' },
		camelCase2: { reflect: true },
		anArray: { attribute: 'an-array', reflect: true, type: 'Array' }
	},
	[],
	[],
	{ mode: 'open' }
));