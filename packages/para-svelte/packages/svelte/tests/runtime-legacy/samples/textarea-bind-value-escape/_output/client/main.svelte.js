import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<textarea></textarea>`);

export default function Main($$anchor) {
	let value = $.mutable_source(`test'"></textarea><script>alert('BIM');</` + `script>`);
	var textarea = root();

	$.remove_textarea_child(textarea);
	$.bind_value(textarea, () => $.get(value), ($$value) => $.set(value, $$value));
	$.append($$anchor, textarea);
}