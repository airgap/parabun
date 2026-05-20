import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Counter from './Counter.svelte';

const foo = ($$anchor) => {
	var p = root_1();

	$.append($$anchor, p);
};

var root_1 = $.from_html(`<p>foo</p>`);

export default function Main($$anchor) {
	Counter($$anchor, {
		get foo() {
			return foo;
		}
	});
}