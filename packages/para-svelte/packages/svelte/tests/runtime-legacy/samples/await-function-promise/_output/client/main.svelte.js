import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let promise = $.prop($$props, 'promise', 12);

	var $$exports = {
		get promise() {
			return promise();
		},

		set promise($$value) {
			promise($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.await(node, promise, null, ($$anchor, value) => {
		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);

		$.template_effect(($0) => $.set_text(text, $0), [
			() => (
				$.deep_read_state($.get(value)),
				$.untrack(() => JSON.stringify($.get(value)))
			)
		]);

		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}