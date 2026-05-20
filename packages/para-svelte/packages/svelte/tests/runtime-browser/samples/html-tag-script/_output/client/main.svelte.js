import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div> <!>`, 1);

export default function _unknown_($$anchor) {
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	$.html(node, () => `<script>document.body.innerHTML = 'this should not be executed'</script>`);
	$.append($$anchor, fragment);
}