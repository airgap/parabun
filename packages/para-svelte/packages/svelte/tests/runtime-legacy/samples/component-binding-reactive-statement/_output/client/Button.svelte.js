import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Button($$anchor, $$props) {
	$.push($$props, false);

	let count = $.prop($$props, 'count', 12);

	function handleClick() {
		count(count() + 1);
	}

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `button ${count() ?? ''}`));
	$.event('click', button, handleClick);
	$.append($$anchor, button);

	return $.pop($$exports);
}