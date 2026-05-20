import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.with_script($.from_html(`<div><style>div { color: red; }</style> <script>\`<>\`</script></div>`));

export default function Main($$anchor) {
	var div = root();

	$.append($$anchor, div);
}