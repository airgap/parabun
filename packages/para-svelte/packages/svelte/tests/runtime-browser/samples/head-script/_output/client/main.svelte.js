import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.with_script($.from_html(
	`<script>
		// A comment
		const val = 'Hello world';
		document.addEventListener('DOMContentLoaded', () => {
			document.querySelector('button').textContent = val;
		});
	</script><!>`,
	1
));

var root = $.from_html(`<button>click me</button>`);

export default function _unknown_($$anchor) {
	var button = root();

	$.head('q2w0q4', ($$anchor) => {
		var fragment = root_1();
		var node = $.sibling($.first_child(fragment));

		$.append($$anchor, fragment);
	});

	$.append($$anchor, button);
}