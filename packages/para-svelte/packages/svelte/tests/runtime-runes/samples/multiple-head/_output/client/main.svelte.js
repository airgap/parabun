import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import MetaTag from './MetaTag.svelte';

var root_1 = $.with_script($.from_html(`<script async="" src="https://www.googletagmanager.com/gtag/js?id=12345"></script><!>`, 1));
var root = $.from_html(`<!> <div>Hello</div>`, 1);

export default function Main($$anchor) {
	var fragment_1 = root();

	$.head('70s021', ($$anchor) => {
		var fragment = root_1();
		var node = $.sibling($.first_child(fragment));

		$.append($$anchor, fragment);
	});

	var node_1 = $.first_child(fragment_1);

	MetaTag(node_1, {});
	$.next(2);
	$.append($$anchor, fragment_1);
}