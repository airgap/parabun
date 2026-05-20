import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<img src="foo.jpg" alt="a foo" class="svelte-xyz"/>`);

export default function Input($$anchor) {
	var img = root();

	$.append($$anchor, img);
}