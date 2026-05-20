import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import counter from './counter.js';

var $$_import_counter = $.reactive_import(() => counter);
var root = $.from_html(`<p> </p> <p></p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);
	let y = $.prop($$props, 'y', 12);

	function myHelper(value) {
		$$_import_counter($$_import_counter().count += 1);

		return value;
	}

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		},

		get y() {
			return y();
		},

		set y($$value) {
			y($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var p_1 = $.sibling(p, 2);

	$.html(p_1, () => ($.deep_read_state(y()), $.untrack(() => myHelper(y()))), true);
	$.reset(p_1);
	$.template_effect(() => $.set_text(text, x()));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}