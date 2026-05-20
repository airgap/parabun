import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>click me</button>`);

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	let handleClick = $.prop($$props, 'handleClick', 12);

	var $$exports = {
		get handleClick() {
			return handleClick();
		},

		set handleClick($$value) {
			handleClick($$value);
			$.flush();
		}
	};

	var button = root();

	$.event('click', button, function (...$$args) {
		handleClick()?.apply(this, $$args);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}