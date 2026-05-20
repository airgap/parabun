import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<button>click me</button>`);
var root_2 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p>loading...</p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let button = $.prop($$props, 'button', 12);
	let thePromise = $.prop($$props, 'thePromise', 12);
	let clicked = $.prop($$props, 'clicked', 12);

	var $$exports = {
		get button() {
			return button();
		},

		set button($$value) {
			button($$value);
			$.flush();
		},

		get thePromise() {
			return thePromise();
		},

		set thePromise($$value) {
			thePromise($$value);
			$.flush();
		},

		get clicked() {
			return clicked();
		},

		set clicked($$value) {
			clicked($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.await(
		node,
		thePromise,
		($$anchor) => {
			var p_1 = root_3();

			$.append($$anchor, p_1);
		},
		($$anchor, theValue) => {
			var button_1 = root_1();

			$.bind_this(button_1, ($$value) => button($$value), () => button());
			$.event('click', button_1, () => clicked($.get(theValue)));
			$.append($$anchor, button_1);
		},
		($$anchor, theError) => {
			var p = root_2();
			var text = $.child(p);

			$.reset(p);

			$.template_effect(() => $.set_text(text, `oh no! ${(
				$.deep_read_state($.get(theError)),
				$.untrack(() => $.get(theError).message)
			) ?? ''}`));

			$.append($$anchor, p);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}