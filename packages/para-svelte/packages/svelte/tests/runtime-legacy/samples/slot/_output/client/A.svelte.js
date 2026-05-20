import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div><!></div>`);
var root = $.from_html(`<!> <!> <!>`, 1);

export default function A($$anchor, $$props) {
	const $$slots = $.sanitize_slots($$props);

	$.push($$props, false);

	let data = '';

	if ($$slots.b) {
		data = 'foo';
	}

	function getData() {
		return data;
	}

	function toString(data) {
		const result = {};
		const sortedKeys = Object.keys(data).sort();

		sortedKeys.forEach((key) => result[key] = data[key]);

		return JSON.stringify(result);
	}

	var $$exports = { getData };

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.slot(node, $$props, 'default', {}, null);

	var node_1 = $.sibling(node, 2);

	$.slot(node_1, $$props, 'a', {}, null);

	var text = $.sibling(node_1);
	var node_2 = $.sibling(text);

	{
		var consequent = ($$anchor) => {
			var div = root_1();
			var node_3 = $.child(div);

			$.slot(node_3, $$props, 'b', {}, null);
			$.reset(div);
			$.append($$anchor, div);
		};

		var alternate = ($$anchor) => {
			var text_1 = $.text('Slot b is not available');

			$.append($$anchor, text_1);
		};

		$.if(node_2, ($$render) => {
			if (($.untrack(() => $$slots.b))) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.template_effect(($0) => $.set_text(text, ` $$slots: ${$0 ?? ''} `), [() => ($.untrack(() => toString($$slots)))]);
	$.append($$anchor, fragment);
	$.bind_prop($$props, 'getData', getData);

	return $.pop($$exports);
}