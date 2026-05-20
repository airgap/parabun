import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let obj = $.mutable_source({ key: 1, value: 3 });

	function mutate() {
		$.mutate(obj, $.get(obj).value = 5);
	}

	function reassign() {
		$.set(obj, { key: 1, value: 7 });
	}

	function changeKey() {
		$.mutate(obj, $.get(obj).key = 3);
	}

	var $$exports = { mutate, reassign, changeKey };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.key(node, () => ($.get(obj), $.untrack(() => $.get(obj).key)), ($$anchor) => {
		var div = root_1();
		var text = $.child(div, true);

		$.reset(div);
		$.template_effect(() => $.set_text(text, ($.get(obj), $.untrack(() => $.get(obj).value))));
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'mutate', mutate);
	$.bind_prop($$props, 'reassign', reassign);
	$.bind_prop($$props, 'changeKey', changeKey);

	return $.pop($$exports);
}