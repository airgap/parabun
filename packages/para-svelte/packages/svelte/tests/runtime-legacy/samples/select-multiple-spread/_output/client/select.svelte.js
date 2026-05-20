import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<select><option>option 1</option><option>option 2</option></select>`);

export default function Select($$anchor, $$props) {
	$.push($$props, false);

	let attrs = $.prop($$props, 'attrs', 12);

	var $$exports = {
		get attrs() {
			return attrs();
		},

		set attrs($$value) {
			attrs($$value);
			$.flush();
		}
	};

	var select = root();

	$.attribute_effect(select, () => ({ multiple: true, ...attrs() }));

	var option = $.child(select);

	option.value = option.__value = '1';

	var option_1 = $.sibling(option);

	option_1.value = option_1.__value = '2';
	$.reset(select);
	$.append($$anchor, select);

	return $.pop($$exports);
}