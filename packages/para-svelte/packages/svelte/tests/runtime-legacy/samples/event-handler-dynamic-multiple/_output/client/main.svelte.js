import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>click me</button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let clickHandlerOne = $.prop($$props, 'clickHandlerOne', 12, 0);
	let clickHandlerTwo = $.prop($$props, 'clickHandlerTwo', 12, 0);
	let f1 = $.mutable_source();
	let f2 = $.mutable_source();

	$.set(f1, () => $.update_prop(clickHandlerOne));
	$.set(f2, () => $.update_prop(clickHandlerTwo));

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

	$.event('click', button, function (...$$args) {
		$.get(f1)?.apply(this, $$args);
	});

	$.event('click', button, function (...$$args) {
		$.get(f2)?.apply(this, $$args);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}