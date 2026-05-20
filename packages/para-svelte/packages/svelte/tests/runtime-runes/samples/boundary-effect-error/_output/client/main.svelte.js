import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Test from './Test.svelte';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		const failed = ($$anchor, e = $.noop) => {
			var p = root_1();
			var text = $.child(p);

			$.reset(p);
			$.template_effect(() => $.set_text(text, `caught: ${e().message ?? ''}`));
			$.append($$anchor, p);
		};

		$.boundary(node, { failed }, ($$anchor) => {
			Test($$anchor, {});
		});
	}

	$.append($$anchor, fragment);
}