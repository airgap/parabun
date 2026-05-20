import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><button>click me</button></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let inner_clicked = $.prop($$props, 'inner_clicked', 12);
	let outer_clicked = $.prop($$props, 'outer_clicked', 12);
	let f1 = $.mutable_source();
	let f2 = $.mutable_source();

	function handle_inner_click(event) {
		inner_clicked(true);
	}

	function handle_outer_click(event) {
		outer_clicked(true);
	}

	$.set(f1, handle_inner_click);
	$.set(f2, handle_outer_click);

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

	$.event('click', button, $.stopPropagation(function (...$$args) {
		$.get(f1)?.apply(this, $$args);
	}));

	$.event('click', div, function (...$$args) {
		$.get(f2)?.apply(this, $$args);
	});

	$.append($$anchor, div);

	return $.pop($$exports);
}