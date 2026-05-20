import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor) {
	function get_handlers() {
		return {
			handle_click: () => {
				$.set(clicked, true);
			}
		};
	}

	let clicked = $.mutable_source(false);
	const { handle_click } = get_handlers();
	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `clicked: ${$.get(clicked) ?? ''}`));
	$.event('click', button, handle_click);
	$.append($$anchor, button);
}