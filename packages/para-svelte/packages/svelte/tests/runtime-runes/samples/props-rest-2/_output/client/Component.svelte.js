import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<li> </li>`);
var root = $.from_html(`<ul></ul>`);

export default function Component($$anchor, $$props) {
	let rest = $.rest_props($$props, ['$$slots', '$$events', '$$legacy']);
	var ul = root();

	$.each(ul, 21, () => Object.getOwnPropertyNames(rest), $.index, ($$anchor, n) => {
		var li = root_1();
		var text = $.child(li, true);

		$.reset(li);
		$.template_effect(() => $.set_text(text, $.get(n)));
		$.append($$anchor, li);
	});

	$.reset(ul);
	$.append($$anchor, ul);
}