import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	function one() {
		two();
	}

	function two() {
		return one();
	}

	var $$exports = { one, two };

	$.next();

	var text = $.text('Compile plz');

	$.append($$anchor, text);
	$.bind_prop($$props, 'one', one);
	$.bind_prop($$props, 'two', two);

	return $.pop($$exports);
}