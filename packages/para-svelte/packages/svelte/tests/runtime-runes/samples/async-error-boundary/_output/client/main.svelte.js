import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		const failed = ($$anchor, error = $.noop) => {
			var p = root_1();
			var text = $.child(p);

			$.reset(p);
			$.template_effect(() => $.set_text(text, `caught: ${error() ?? ''}`));
			$.append($$anchor, p);
		};

		$.boundary(node, { failed }, ($$anchor) => {
			$.next();

			var text_1 = $.text();

			$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => Promise.reject('catch me')]);
			$.append($$anchor, text_1);
		});
	}

	$.append($$anchor, fragment);
}