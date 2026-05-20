import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<li> </li>`);
var root = $.from_html(`<p> </p> <ul></ul>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let state = $.prop($$props, 'state', 12);
	let states = $.prop($$props, 'states', 12);

	var $$exports = {
		get state() {
			return state();
		},

		set state($$value) {
			state($$value);
			$.flush();
		},

		get states() {
			return states();
		},

		set states($$value) {
			states($$value);
			$.flush();
		}
	};

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var ul = $.sibling(p, 2);

	$.each(ul, 5, states, $.index, ($$anchor, state, $$index, $$array) => {
		var li = root_1();
		var text_1 = $.child(li, true);

		$.reset(li);
		$.template_effect(() => $.set_text(text_1, $.get(state)));
		$.append($$anchor, li);
	});

	$.reset(ul);
	$.template_effect(() => $.set_text(text, `Current state: ${state() ?? ''}`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}