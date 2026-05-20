import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>click me</button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let clickHandlerOne = $.prop($$props, 'clickHandlerOne', 12, 0);
	let clickHandlerTwo = $.prop($$props, 'clickHandlerTwo', 12, 0);

	var $$exports = {
		get clickHandlerOne() {
			return clickHandlerOne();
		},

		set clickHandlerOne($$value) {
			clickHandlerOne($$value);
			$.flush();
		},

		get clickHandlerTwo() {
			return clickHandlerTwo();
		},

		set clickHandlerTwo($$value) {
			clickHandlerTwo($$value);
			$.flush();
		}
	};

	var button = root();

	$.event('click', button, () => $.update_prop(clickHandlerOne));
	$.event('click', button, () => $.update_prop(clickHandlerTwo));
	$.append($$anchor, button);

	return $.pop($$exports);
}