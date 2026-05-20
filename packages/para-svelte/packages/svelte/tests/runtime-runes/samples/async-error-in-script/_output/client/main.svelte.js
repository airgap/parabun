import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1>hello</h1>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	var $$promises = $.run([
		() => 1,
		() => {
			throw new Error('oops');
		}
	]);

	var h1 = root();

	$.append($$anchor, h1);
	$.pop();
}