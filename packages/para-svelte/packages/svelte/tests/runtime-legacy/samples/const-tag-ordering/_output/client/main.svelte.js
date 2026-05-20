import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12, 4);

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => [value()], $.index, ($$anchor, n) => {
		const squared = $.derived_safe_equal(() => $.get(n) * $.get(n));
		const cubed = $.derived_safe_equal(() => $.get(squared) * $.get(n));
		const hypercubed = $.derived_safe_equal(() => $.get(cubed) * $.get(n));
		var div = root_1();
		var text = $.child(div);

		$.reset(div);
		$.template_effect(() => $.set_text(text, `${$.get(n) ?? ''} ^ 4 = ${$.get(hypercubed) ?? ''}`));
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}