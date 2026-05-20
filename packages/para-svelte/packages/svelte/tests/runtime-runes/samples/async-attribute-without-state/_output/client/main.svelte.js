import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending</p>`);
var root_2 = $.from_html(`<p>hello</p>`);

export default function Main($$anchor) {
	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var p_1 = root_2();

			$.template_effect(($0) => $.set_attribute(p_1, 'data-foo', $0), void 0, [() => 'bar']);
			$.append($$anchor, p_1);
		});
	}

	$.append($$anchor, fragment);
}