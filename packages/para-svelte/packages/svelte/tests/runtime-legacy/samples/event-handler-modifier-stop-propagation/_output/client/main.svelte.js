import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><button>click me</button></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let inner_clicked = $.prop($$props, 'inner_clicked', 12);
	let outer_clicked = $.prop($$props, 'outer_clicked', 12);

	function handle_inner_click(event) {
		inner_clicked(true);
	}

	function handle_outer_click(event) {
		outer_clicked(true);
	}

	var $$exports = {
		get inner_clicked() {
			return inner_clicked();
		},

		set inner_clicked($$value) {
			inner_clicked($$value);
			$.flush();
		},

		get outer_clicked() {
			return outer_clicked();
		},

		set outer_clicked($$value) {
			outer_clicked($$value);
			$.flush();
		}
	};

	var div = root();
	var button = $.child(div);

	$.reset(div);
	$.event('click', button, $.stopPropagation(handle_inner_click));
	$.event('click', div, handle_outer_click);
	$.append($$anchor, div);

	return $.pop($$exports);
}