import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_svg(`<svg><g><circle class="red"></circle></g></svg>`);

export default function Main($$anchor) {
	var svg = root();

	$.append($$anchor, svg);
}