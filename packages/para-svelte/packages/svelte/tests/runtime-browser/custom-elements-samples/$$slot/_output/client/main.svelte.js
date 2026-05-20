import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div><!></div>`);
var root_2 = $.from_html(`<p>Slot b is not available</p>`);
var root = $.from_html(`<!> <!> <p> </p> <!>`, 1);

export default function _unknown_($$anchor, $$props) {
	const $$slots = $.sanitize_slots($$props);

	$.push($$props, false);

	let data = "";

	if ($$slots.b) {
		data = "foo";
	}

	function getData() {
		return data;
	}

	function toString(data) {
		const result = {};
		const sortedKeys = Object.keys(data).sort();

		sortedKeys.forEach((key) => result[key] = data[key] ? true : false);

		return JSON.stringify(result);
	}

	var $$exports = { getData };

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.slot(node, $$props, 'default', {}, null);

	var node_1 = $.sibling(node, 2);

	$.slot(node_1, $$props, 'a', {}, null);

	var p = $.sibling(node_1, 2);
	var text = $.child(p);

	$.reset(p);

	var node_2 = $.sibling(p, 2);

	{
		var consequent = ($$anchor) => {
			var div = root_1();
			var node_3 = $.child(div);

			$.slot(node_3, $$props, 'b', {}, null);
			$.reset(div);
			$.append($$anchor, div);
		};

		var alternate = ($$anchor) => {
			var p_1 = root_2();

			$.append($$anchor, p_1);
		};

		$.if(node_2, ($$render) => {
			if ($$slots.b) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.template_effect(($0) => $.set_text(text, `$$slots: ${$0 ?? ''}`), [() => toString($$slots)]);
	$.append($$anchor, fragment);
	$.bind_prop($$props, 'getData', getData);

	return $.pop($$exports);
}

customElements.define('custom-element', $.create_custom_element(_unknown_, {}, ['default', 'a', 'b'], ['getData'], { mode: 'open' }));