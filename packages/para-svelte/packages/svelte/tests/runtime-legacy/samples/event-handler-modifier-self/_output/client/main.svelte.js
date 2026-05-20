import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><button>click me</button></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let inner_clicked = $.prop($$props, 'inner_clicked', 12);

	function handle_click(event) {
		inner_clicked(true);
	}

	var $$exports = {
		get inner_clicked() {
			return inner_clicked();
		},

		set inner_clicked($$value) {
			inner_clicked($$value);
			$.flush();
		}
	};

	var div = root();

	$.event('click', div, $.self(handle_click));
	$.append($$anchor, div);

	return $.pop($$exports);
}