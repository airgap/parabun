import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let array = $.prop($$props, 'array', 28, () => [1]);

	function append(value) {
		array().push(value);
		array(array());
	}

	var $$exports = {
		append,
		get array() {
			return array();
		},

		set array($$value) {
			array($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.key(node, array, ($$anchor) => {
		var div = root_1();
		var text = $.child(div, true);

		$.reset(div);

		$.template_effect(($0) => $.set_text(text, $0), [
			() => (
				$.deep_read_state(array()),
				$.untrack(() => array().join(','))
			)
		]);

		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'append', append);

	return $.pop($$exports);
}